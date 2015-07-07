var decpw = false;

if(loadval("pgpanywhere_encrypted",0)==1) 
{
	chrome.browserAction.setPopup({popup:"html/unlock.html"});
	chrome.browserAction.setIcon({path:"img/favicon_lock.png"});
}
else 
{
	chrome.browserAction.setPopup({popup:"html/popup.html"});
	chrome.browserAction.setIcon({path:"img/favicon_19.png"});
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if(request.msg == "masterauth_request")
		{
			chrome.runtime.sendMessage({ msg: "masterauth_answer", "auth": decpw, process: request.process });
			sendResponse(true);
		}
		else if(request.msg == "unlock")
		{
			chrome.browserAction.setPopup({popup:"html/popup.html"});
			chrome.browserAction.setIcon({path:"img/favicon_19.png"});
			decpw = request.auth;
			sendResponse(true);
		}
    }
);

function loadval(key,def)
{
	var retval = localStorage.getItem(key);
	if( retval == undefined ) retval = def;
	if(retval == "true") retval = true;
	else if(retval == "false") retval = false;
	return retval;
}