var masterpw = "";

function master_auth(func)
{
	if(masterpw.length) return func(masterpw);
	var identifier = randomString(200);
	
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		if(request.msg == "masterauth_answer" && request.process == identifier) 
		{
			if(request.auth==false || request.auth=="false") return window.close();
			masterpw = request.auth;
			return func(masterpw);
		}
	});
	chrome.runtime.sendMessage({ msg: "masterauth_request", process: identifier});
}

function randomString(len, charSet) 
{
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
    	var randomPoz = Math.floor(Math.random() * charSet.length);
    	randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}