#!/bin/bash
cd /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA/aom-studio
git commit -m "feat(corner:cv6): nested room tree Home + Organize R-ROOMTREE-1

Wire proj.tree from missions-tree API into Home All Rooms panel and
Organize tab so Patrik sees openable nested folders not a flat pile.

- useHomeData: consume proj.tree instead of flat proj.missions
- CornerCV6: expandedHomeNodes state + toggleMissionNode + flattenMissionTree
- home-desktop.html: depth mod + disclosure caret SVG on missrow
- cv6.css: d1/d2 indent rules + caret visibility
- useOrganize: missions-tree fetch, d1 rows under active project
- OrganizeDesktop: openTreeNode handles project:mission slugs
- missions-registry.json: rebuilt registry deduped by folder_name

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MVcfk1xuKpq8BwCPsmZnAW"
