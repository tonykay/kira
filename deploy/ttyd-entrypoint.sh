#!/bin/bash
# ttyd entrypoint — starts 3 ttyd instances
# Port 7681: ticket-context terminal (receives args from iframe URL)
# Port 7682: workspace terminal 1 (persistent plain bash)
# Port 7683: workspace terminal 2 (persistent plain bash)

# Start workspace terminals in background (plain bash, no ticket context)
ttyd --port 7682 --writable bash &
ttyd --port 7683 --writable bash &

# Start ticket-context terminal in foreground (receives args via iframe URL)
exec ttyd --port 7681 --writable ttyd-session.sh
