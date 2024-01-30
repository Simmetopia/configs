function run_more
  if contains -- "--help" $argv; or contains -h $argv
    echo "run_more - Execute a command multiple times in sequence."
    echo ""
    echo "Usage:"
    echo "    run_more <command> <times>"
    echo "    <command> - The command to be executed, provided as a string."
    echo "    <times>   - The number of times the command should be executed."
    echo ""
    echo "Example:"
    echo "    run_more \"npm run test\" 10"
    echo ""
    echo "Notes:"
    echo "    - This function does not provide error handling. If the command fails, it will continue to execute it the specified number of times unless manually interrupted."
    echo "    - Output and errors from the executed command will be displayed in the terminal."
    return
  end
  set cmd $argv[1]
  set cound $argv[2]

  for i in (seq 1 $count)
    eval $cmd
  end
end
