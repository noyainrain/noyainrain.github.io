#!/usr/bin/env python3

from urllib.request import urlopen
from subprocess import run, PIPE
import json
import re
from typing import Tuple, Optional, Generator, List, Sequence

from itertools import chain

import os
import sys

from datetime import date, datetime, timedelta

Issue = Tuple[str, str, Tuple[str, str], Optional[int]]

POST_TEMPLATE = """\
---
title: micro log {week}
log:
{issues}\
#   - type: finance
#     summary:
#   - type: other
#     summary:
---
"""

ISSUE_TEMPLATE = """\
    - type:{typ}
      summary:{summary}
      project:{project}
"""

cal = date.today().isocalendar()
week = sys.argv[1] if len(sys.argv) >= 2 else cal[1]
year = sys.argv[2] if len(sys.argv) >= 3 else cal[0]

publish = datetime.strptime('{} {} {}'.format(year, week, 5), '%G %V %u')
first = publish - timedelta(days=4)
last = publish + timedelta(days=3)

#print('FIRST', first)
#print('PUBLISH', publish)
#print('LAST', last)

path = '_posts/{}-micro-log-{}.md'.format(publish.date().isoformat(), week)

# TODO
if os.path.exists(path):
    print('Log entry already exists')
    sys.exit(1)

PROJECTS = [('listling', 'Listling'), ('micro', 'micro')] #, ('noya', 'noyainrain.github.io')]
#project = PROJECTS[1]
#project = 'micro'
#project_path = '/home/noya/projects/micro/repo'

#x = run(['git', '-C', project_path, 'log', '--first-parent', '--format=%B%n', '--since="last week"'],
#        check=True, stdout=PIPE, universal_newlines=True).stdout
#merges = x.splitlines()
#merges = [re.fullmatch(r"Merge branch '(.+)'", merge).group(1) for merge in merges] # type: ignore

def master_topics(project: Tuple[str, str], since: datetime, until: datetime) -> Generator[Issue, None, None]:
    project_path = '/home/noya/projects/{}/repo'.format(project[0])
    log = run(
        ['git', '-C', project_path, 'log', 'master', '--first-parent', '--format=--commit%n%B%n',
         '--since={}'.format(since.isoformat()),
         '--until={}'.format(until.isoformat()), '--reverse'],
        check=True, stdout=PIPE, universal_newlines=True).stdout
    commits = log.split('--commit\n')[1:]
    for commit in commits:
        subject = commit.splitlines()[0]
        topics = [('dev-done', subject, project, int(match.group(1))) for match in re.finditer('#(\d+)', commit)] # type: List[Tuple[str, str, Tuple[str, str], Optional[int]]]
        if not topics:
            topics = [('dev-done', subject, project, None)]
        yield from topics

def branch_topics(project: Tuple[str, str], since: datetime, until: datetime) -> Generator[Issue, None, None]:
    project_path = '/home/noya/projects/{}/repo'.format(project[0])
    output = run(
        ['git', '-C', project_path, 'branch', '--remotes', '--format=%(refname)'],
        check=True, stdout=PIPE, universal_newlines=True).stdout
    branches = output.splitlines()
    # could sort by committer date, but not really so relevant, if large commit for A and after that
    # a small for B, we would want A still at top -> sort by lines changed, but yeah, moving around
    # a large blob is also no indicator how much time spent... well maybe by hand is best here?
    for branch in branches:
        name = branch[len('refs/remotes/origin/'):]
        match = re.search('-(\d+)$', name)
        nr = int(match.group(1)) if match else None
        if name not in ('HEAD', 'master'):
            output = run(['git', '-C', project_path, 'log', branch, '--first-parent',
                 '--since={}'.format(since.isoformat()),
                 '--until={}'.format(until.isoformat())],
                check=True, stdout=PIPE, universal_newlines=True).stdout
            if output:
                yield ('', name, project, nr)
    #refs = re.split('[\s,]+', output)
    #for ref in refs:
    #    match = re.fullmatch('origin/(.+)', ref)
    #    if not match:
    #        continue
    #    name = match.group(1)
    #    if name not in ('HEAD', 'master'):
    #        match = re.search('-(\d+)$', name)
    #        yield ('', name, project, int(match.group(1)) if match else None)
    #output = run(
    #    ['git', '-C', project_path, 'branch', '--remotes',
    #     '--format=%(refname) %(committerdate:unix)'],
    #    check=True, stdout=PIPE, universal_newlines=True).stdout
    #branches = ['foo-25', 'bar-24', 'oink']
    #for line in output.splitlines():
    #    name, timestamp = line.split()
    #    name = name[len('refs/remotes/origin/'):]
    #    time = datetime.utcfromtimestamp(int(timestamp))
    #    print('BRANCH', name, time)
    #    if name != 'HEAD' and since <= time < until:
    #        match = re.search('-(\d+)$', name)
    #        yield ('', name, project, int(match.group(1)) if match else None)

def resolve_issues(topics: Sequence[Issue]) -> Generator[Issue, None, None]:
    print('Resolving issues ', end='', file=sys.stderr, flush=True)
    for (typ, summary, project, nr) in topics:
        #nr = None # XXX
        if nr:
            print('.', end='', file=sys.stderr, flush=True)
            url = 'https://api.github.com/repos/noyainrain/{}/issues/{}'.format(project[0], nr)
            try:
                uf = urlopen(url)
            except Exception as e:
                print('\nGET {}: {}\n'.format(url, str(e)), end='', file=sys.stderr, flush=True)
            else:
                issue = json.load(uf)
                if not typ:
                    typ = 'dev-in-progress' if issue['assignees'] else 'dev-experimental'
                summary = '{} [#{}]({})'.format(issue['title'], issue['number'], issue['html_url'])
        yield (typ, summary, project, None)
    print('\n', end='', file=sys.stderr, flush=True)

topics = list(
    chain.from_iterable(
        chain(master_topics(project, first, last), branch_topics(project, first, last))
            for project in PROJECTS))
#print("TOPICS", topics)
topics = list(resolve_issues(topics))
#print("TOPICS", topics)

#branches = [(merge, True) for merge in merges] + [(ref, False) for ref in refs]

order = ['dev-done', 'dev-in-progress', 'dev-experimental', '']
topics.sort(key=lambda e: order.index(e[0]))

def pad(value):
    return ' {}'.format(value) if value else ''

events_str = [ISSUE_TEMPLATE.format(typ=pad(event[0]), summary=pad(event[1]), project=pad(event[2][1])) for event in topics]
result = POST_TEMPLATE.format(week=week, issues=''.join(events_str))
#print(result)

with open(path, 'x') as f:
    f.write(result)

editor = os.environ.get('EDITOR', 'vim')
os.execlp(editor, editor, path)
