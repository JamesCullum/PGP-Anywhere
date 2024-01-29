var bcrypt = new bCrypt();

$(document).ready(async function() {
	if(await loadval("pgpanywhere_encrypted", 0) != 1) closeme();
	$("#decmasterpw").focus();

	$("#dellog").click(async function() {
		if(confirm(chrome.i18n.getMessage("delete_confirm")))
		{
			await chrome.storage.sync.clear();
			await chrome.storage.local.clear();
			window.location = "options.html";
		}
	});
	$("#declogin").click(async function() {
		var decpw = $("#decmasterpw").val();
		if( decpw.length == 0 ) return;
		
		$("#declogin").attr("disabled","disabled");
		checkhash(decpw, await loadval("pgpanywhere_encrypted_hash",false), async function(result) {
			if(result)
			{
				// Check public queue
				var queue = await loadval("pgpanywhere_sync_public_queue", "");
				if(queue.length)
				{
					queue = jQuery.parseJSON(queue);
					console.log(queue);
					var container = [];
					
					for(var i=0;i<queue.length;i++)
					{
						container[i] = jQuery.parseJSON(sjcl.decrypt(decpw, queue[i]));
					}
					var temp_public_save = JSON.stringify(container);
					await setval("pgpanywhere_public_keyring", sjcl.encrypt(decpw, temp_public_save));
					await setval("pgpanywhere_sync_public_queue", "");
				}
				
				// Check private queue
				queue = await loadval("pgpanywhere_sync_private_queue", "");
				if(queue.length)
				{
					queue = jQuery.parseJSON(queue);
					var container = [];
					
					for(var i=0;i<queue.length;i++)
					{
						container[i] = jQuery.parseJSON(sjcl.decrypt(decpw, queue[i]));
					}
					var temp_public_save = JSON.stringify(container);
					await setval("pgpanywhere_private_keyring", sjcl.encrypt(decpw, temp_public_save));
					await setval("pgpanywhere_sync_private_queue", "");
				}
				
				chrome.runtime.sendMessage({ msg: "unlock", "auth": decpw });
				window.location = "popup.html";
			}
			else
			{
				$("#declogin").removeAttr("disabled");
				$("#decmasterpw").val("").closest(".form-group").addClass("has-error");
			}
		});
	});
	$("#decmasterpw").keyup(function(event){
		if(event.keyCode == 13) $("#declogin").click();
	});
});

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

function closeme()
{
	window.close();
}

function checkhash(pw, hash, func)
{
	if( hash.indexOf("$") == -1 ) //SHA-512
	{
		var result = getshahash(pw)==hash;
		return func(result);
	}
	//bCrypt
	if(!bcrypt.ready()) return setTimeout(function() { checkhash(pw,hash,func); }, 500); 
	try {
       	bcrypt.checkpw( pw, hash, function(result) {
			return func(result); 
		}, function() {});
    }catch(err){
		return alert(err);
    }
}

function getshahash(str)
{
	var shaObj = new jsSHA(str, "TEXT");
	var hash = shaObj.getHash("SHA-512", "HEX");
	return hash;
}