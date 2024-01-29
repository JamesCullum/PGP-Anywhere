var decpw = false, syncloadcount = 0, synccounter = 0, syncId = false;

init().then(async () => {
	[decpw, syncId, wasSynced] = await Promise.all([
		loadSessionVal("decpw", false),
		loadSessionVal("syncId", false),
		loadSessionVal("wasSynced", false),
	]);

	if(!wasSynced) test_sync();
});

chrome.runtime.onMessage.addListener(
    async function(request, sender, sendResponse) {
        if(request.msg == "masterauth_request")
		{
			chrome.runtime.sendMessage({ msg: "masterauth_answer", "auth": decpw, process: request.process });
			sendResponse(true);
		} else if(request.msg == "unlock") {
			chrome.action.setPopup({popup:"/html/popup.html"});
			chrome.action.setIcon({path:"/img/favicon_19.png"});
			sendResponse(true);
			await setSessionVal("decpw", request.auth);
		} else if(request.msg == "syncId") {
			chrome.runtime.sendMessage({ msg: "syncId_answer", "id": syncId });
			sendResponse(true);
		}
    }
);

chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install") init_sync(1);
});

async function init()
{
	if(await loadval("pgpanywhere_encrypted", 0) == 1) 
	{
		chrome.action.setPopup({popup:"/html/unlock.html"});
		chrome.action.setIcon({path:"/img/favicon_lock.png"});
	} else {
		chrome.action.setPopup({popup:"/html/popup.html"});
		chrome.action.setIcon({path:"/img/favicon_19.png"});
	}
}

function test_sync() {
	if(syncId != false) return init_sync(0);
	
	chrome.identity.getProfileUserInfo(function(data) {
		if (data.id) {
			console.log("User is logged in");
			syncId = data.id;
			setSessionVal("syncId", syncId).then(() => {
				init_sync(0);
			});
		} else {
			console.warn("User is not logged into Chrome - won't sync anything");
		}
	});
}

function init_sync(tutorial)
{
	// Verify that the user is logged in before overriding the local keyring with cloud data
	if(syncId == false) return;

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

			Promise.all([
				setval("pgpanywhere_encrypted", decdata.encrypted),
				setval("pgpanywhere_encrypted_hash", decdata.hash),
			]).then(() => {
				onsyncload();
			});
		});
		
		// Public Keys
		chrome.storage.sync.get("pgpanywhere_sync_container_publickeys", async function (sync_container) {
			onsyncload();
			
			if(jQuery.isEmptyObject(sync_container))
			{
				addSyncElement(1);
				chrome.storage.sync.get("pgpanywhere_sync_public_list", async function (sync_container) {
					onsyncload();
					
					if(!jQuery.isEmptyObject(sync_container))
					{
						var keylist = parseInt(sync_container.pgpanywhere_sync_public_list);
						await setval("pgpanywhere_sync_public_queue", "[]");
						addSyncElement(keylist);
						for(var i=0;i<keylist;i++)
						{
							var sync_label = "pgpanywhere_sync_public_"+i;
							chrome.storage.sync.get(sync_label, async function (sync_container) {
								var queue = jQuery.parseJSON(await loadval("pgpanywhere_sync_public_queue","[]"));
								if(!jQuery.isEmptyObject(sync_container)) 
								{
									var pushme = sync_container[Object.keys(sync_container)[0]];
									if(pushme.length) queue.push(pushme);
								}
								await setval("pgpanywhere_sync_public_queue", JSON.stringify(queue) );
							});
						}
					}
				});
			}
			else 
			{
				await setval("pgpanywhere_public_keyring", sync_container.pgpanywhere_sync_container_publickeys );
			}
		});
		
		// Private Keys
		chrome.storage.sync.get("pgpanywhere_sync_container_privatekeys", async function (sync_container) {
			onsyncload();
			
			if(jQuery.isEmptyObject(sync_container))
			{
				addSyncElement(1);
				chrome.storage.sync.get("pgpanywhere_sync_private_list", async function (sync_container) {
					onsyncload();
					
					if(!jQuery.isEmptyObject(sync_container))
					{
						var keylist = parseInt(sync_container.pgpanywhere_sync_private_list);
						await setval("pgpanywhere_sync_private_queue", "[]");
						addSyncElement(keylist);
						for(var i=0;i<keylist;i++)
						{
							var sync_label = "pgpanywhere_sync_private_"+i;
							chrome.storage.sync.get(sync_label, async function (sync_container) {
								var queue = jQuery.parseJSON(await loadval("pgpanywhere_sync_private_queue","[]"));
								if(!jQuery.isEmptyObject(sync_container)) 
								{
									var pushme = sync_container[Object.keys(sync_container)[0]];
									queue.push(pushme);
								}
								await setval("pgpanywhere_sync_private_queue", JSON.stringify(queue) );
							});
						}
					}
				});
			}
			else 
			{
				await setval("pgpanywhere_private_keyring", sync_container.pgpanywhere_sync_container_publickeys );
			}
		});
	});
}

async function loadval(key, def)
{
	var retval = await chrome.storage.local.get([key]);
	if(key in retval) retval = retval[key];
	else retval = def;

	if(retval == "true") retval = true;
	else if(retval == "false") retval = false;
	return retval;
}

async function setval(key, val) 
{
	const saveObj = {}
	saveObj[key] = val
	return (await chrome.storage.local.set(saveObj))
}

async function loadSessionVal(key, def)
{
	var retval = await chrome.storage.local.get([key]);
	if(key in retval) retval = retval[key];
	else retval = def;

	if(retval == "true") retval = true;
	else if(retval == "false") retval = false;
	return retval;
}

async function setSessionVal(key, val) 
{
	const saveObj = {}
	saveObj[key] = val
	return (await chrome.storage.local.set(saveObj))
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