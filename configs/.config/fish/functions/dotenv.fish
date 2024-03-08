function dotenv
    set -l dotenv_path $argv[1]
    if test -z "$dotenv_path"
        set dotenv_path ".env"  # Default to .env in the current directory
    end

    if not test -e $dotenv_path
        echo "Dotenv file '$dotenv_path' not found"
        return 1
    end

    for line in (cat $dotenv_path)
        set -l key_value (echo $line | string split "=")
        if test (count $key_value) -eq 2
            set -gx $key_value[1] $key_value[2]
        end
    end
end
