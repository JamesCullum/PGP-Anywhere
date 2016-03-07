var decpw = false, syncloadcount = 0, synccounter = 0;

init();
init_sync(0);

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
    if(details.reason == "install") init_sync(1);
});

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

function init_sync(tutorial)
{
	chrome.storage.sync.get("pgpanywhere_sync_set", function (sync_container) {
		if(jQuery.isEmptyObject(sync_container)) 
		{
			if(tutorial) window.open("html/tutorial.html");
			return;
		}

		syncloadcount = 0;
		synccounter = 0;
		
		addSyncElement(3);
		chrome.storage.sync.get("pgpanywhere_sync_container_settings", function (sync_container) {
			var decdata = jQuery.parseJSON(sync_container.pgpanywhere_sync_container_settings);

			localStorage.setItem("pgpanywhere_encrypted", decdata.encrypted);
			localStorage.setItem("pgpanywhere_encrypted_hash",  decdata.hash );
			onsyncload();
		});
		
		// Public Keys
		chrome.storage.sync.get("pgpanywhere_sync_container_publickeys", function (sync_container) {
			onsyncload();
			
			if(jQuery.isEmptyObject(sync_container))
			{
				addSyncElement(1);
				chrome.storage.sync.get("pgpanywhere_sync_public_list", function (sync_container) {
					onsyncload();
					
					if(!jQuery.isEmptyObject(sync_container))
					{
						var keylist = parseInt(sync_container.pgpanywhere_sync_public_list);
						localStorage.setItem("pgpanywhere_sync_public_queue", "[]");
						addSyncElement(keylist);
						for(var i=0;i<keylist;i++)
						{
							var sync_label = "pgpanywhere_sync_public_"+i;
							chrome.storage.sync.get(sync_label, function (sync_container) {
								var queue = jQuery.parseJSON(loadval("pgpanywhere_sync_public_queue","[]"));
								if(!jQuery.isEmptyObject(sync_container)) 
								{
									var pushme = sync_container[Object.keys(sync_container)[0]];
									if(pushme.length) queue.push(pushme);
								}
								localStorage.setItem("pgpanywhere_sync_public_queue", JSON.stringify(queue) );
							});
						}
					}
				});
			}
			else 
			{
				localStorage.setItem("pgpanywhere_public_keyring", sync_container.pgpanywhere_sync_container_publickeys );
			}
		});
		
		// Private Keys
		chrome.storage.sync.get("pgpanywhere_sync_container_privatekeys", function (sync_container) {
			onsyncload();
			
			if(jQuery.isEmptyObject(sync_container))
			{
				addSyncElement(1);
				chrome.storage.sync.get("pgpanywhere_sync_private_list", function (sync_container) {
					onsyncload();
					
					if(!jQuery.isEmptyObject(sync_container))
					{
						var keylist = parseInt(sync_container.pgpanywhere_sync_private_list);
						localStorage.setItem("pgpanywhere_sync_private_queue", "[]");
						addSyncElement(keylist);
						for(var i=0;i<keylist;i++)
						{
							var sync_label = "pgpanywhere_sync_private_"+i;
							chrome.storage.sync.get(sync_label, function (sync_container) {
								var queue = jQuery.parseJSON(loadval("pgpanywhere_sync_private_queue","[]"));
								if(!jQuery.isEmptyObject(sync_container)) 
								{
									var pushme = sync_container[Object.keys(sync_container)[0]];
									queue.push(pushme);
								}
								localStorage.setItem("pgpanywhere_sync_private_queue", JSON.stringify(queue) );
							});
						}
					}
				});
			}
			else 
			{
				localStorage.setItem("pgpanywhere_private_keyring", sync_container.pgpanywhere_sync_container_publickeys );
			}
		});
	});
}

function loadval(key,def)
{
	var retval = localStorage.getItem(key);
	if( retval == undefined || retval === null ) retval = def;
	if(retval == "true") retval = true;
	else if(retval == "false") retval = false;
	return retval;
}

function addSyncElement(add)
{
	synccounter+=add;
}

function onsyncload()
{
	syncloadcount++;
	if(syncloadcount>=synccounter) 
	{
		console.log("finished sync, reloading");
		init();
	}
}