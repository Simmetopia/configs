Xephyr :1 -screen 1280x800 &
DISPLAY=:1 $HOME/awesome/bin/awesome \
    -c $HOME/.config/awesome/rc.lua \
    --search $HOME/awesome/share/awesome/lib
