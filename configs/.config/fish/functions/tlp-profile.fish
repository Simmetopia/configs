function tlp-profile
    set -l profile_dir ~/configs/configs/.config/tlp-profiles
    set -l tlp_conf /etc/tlp.d/01-profile.conf

    switch "$argv[1]"
        case quiet battery
            sudo cp "$profile_dir/$argv[1].conf" $tlp_conf
            and sudo tlp power-saver
            and echo "Switched to $argv[1] profile"
        case full
            sudo cp "$profile_dir/$argv[1].conf" $tlp_conf
            and sudo tlp start
            and echo "Switched to $argv[1] profile"
        case status ''
            if test -f $tlp_conf
                set -l current (basename (readlink -f $tlp_conf 2>/dev/null) .conf)
                # Check which profile matches
                for profile in quiet battery full
                    if diff -q "$profile_dir/$profile.conf" $tlp_conf >/dev/null 2>&1
                        echo "Current profile: $profile"
                        return 0
                    end
                end
                echo "Current profile: custom/unknown"
            else
                echo "No profile active"
            end
        case '*'
            echo "Usage: tlp-profile [quiet|battery|full|status]"
            return 1
    end
end
