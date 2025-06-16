function git-cred
      # Set path to the encrypted credentials file
    set encrypted_credentials_path "~/.git-credentials.gpg"

    # Set the output path for decrypted credentials
    set decrypted_credentials_path "/tmp/git-credentials/.git-credentials"

    # Decrypt the credentials using GPG
    gpg --batch --yes --decrypt --output $decrypted_credentials_path $encrypted_credentials_path

    # Store the decrypted credentials in Git's credential cache
    git credential-cache store < $decrypted_credentials_path
end
