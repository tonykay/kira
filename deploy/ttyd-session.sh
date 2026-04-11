#!/bin/bash
# Session wrapper — receives ticket context from ttyd URL args
# ttyd calls this as: ttyd-session.sh <TICKET_ID> <TICKET_TITLE> <TICKET_AREA> <AFFECTED_SYSTEMS> <TICKET_SKILLS>

export TICKET_ID="${1:-}"
export TICKET_TITLE="${2:-}"
export TICKET_AREA="${3:-}"
export AFFECTED_SYSTEMS="${4:-}"
export TICKET_SKILLS="${5:-}"

if [ -n "$TICKET_ID" ]; then
    echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\e[0m"
    echo -e "\e[33m  Kira Troubleshooting Terminal\e[0m"
    echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\e[0m"
    echo -e "\e[36m  Ticket:  \e[0m$TICKET_TITLE"
    echo -e "\e[36m  Area:    \e[0m$TICKET_AREA"
    echo -e "\e[36m  Systems: \e[0m$AFFECTED_SYSTEMS"
    echo -e "\e[36m  Skills:  \e[0m$TICKET_SKILLS"
    echo ""
    if [ -d "/artifacts/$TICKET_ID" ]; then
        ARTIFACT_COUNT=$(ls -1 "/artifacts/$TICKET_ID" 2>/dev/null | wc -l)
        echo -e "\e[36m  Artifacts: \e[0m${ARTIFACT_COUNT} file(s) in /artifacts/$TICKET_ID/"
    else
        echo -e "\e[36m  Artifacts: \e[0mnone"
    fi
    echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\e[0m"
    echo ""
fi

exec bash
