var decpw = false;

init();

function init()
{
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

chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install") 
	{
        chrome.storage.sync.get("pgpanywhere_sync_set", function (sync_container) {
			if(jQuery.isEmptyObject(sync_container)) return;

			syncloadcount = 0;
			chrome.storage.sync.get("pgpanywhere_sync_container_settings", function (sync_container) {
				var decdata = jQuery.parseJSON(sync_container.pgpanywhere_sync_container_settings);
				
				localStorage.setItem("pgpanywhere_encrypted", decdata.encrypted);
				localStorage.setItem("pgpanywhere_encrypted_hash",  decdata.hash );
				onsyncload();
			});
			chrome.storage.sync.get("pgpanywhere_sync_container_publickeys", function (sync_container) {
				localStorage.setItem("pgpanywhere_public_keyring", sync_container.pgpanywhere_sync_container_publickeys );
				onsyncload();
			});
			chrome.storage.sync.get("pgpanywhere_sync_container_privatekeys", function (sync_container) {
				localStorage.setItem("pgpanywhere_private_keyring", sync_container.pgpanywhere_sync_container_privatekeys );
				onsyncload();
			});
		});
    }
});

function loadval(key,def)
{
	var retval = localStorage.getItem(key);
	if( retval == undefined ) retval = def;
	if(retval == "true") retval = true;
	else if(retval == "false") retval = false;
	return retval;
}

function onsyncload()
{
	syncloadcount++;
	if(syncloadcount>=3) init();
}