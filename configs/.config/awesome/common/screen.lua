local screen = {};

function screen.prompt(){
	 local commant = 'echo -e "first\nsecond\nthird" | dmenu';

	awful.spawn.easy_async(noisy, function(stdout, stderr, reason, exit_code)
   	naughty.notify { text = stdout }
end)}

return screen;
