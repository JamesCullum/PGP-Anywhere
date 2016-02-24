var bcrypt = new bCrypt();

$(document).ready(function() {
	if( loadval("pgpanywhere_encrypted",0)!=1 ) closeme();
	$("#decmasterpw").focus();

	$("#dellog").click(function() {
		if(confirm(chrome.i18n.getMessage("delete_confirm")))
		{
			chrome.storage.sync.clear();
			localStorage.clear();
			window.location = "options.html";
		}
	});
	$("#declogin").click(function() {
		var decpw = $("#decmasterpw").val();
		if( decpw.length == 0 ) return;
		
		$("#declogin").attr("disabled","disabled");
		checkhash(decpw,loadval("pgpanywhere_encrypted_hash",false), function(result) {
			if(result)
			{
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

function loadval(key,def)
{
	var retval = localStorage.getItem(key);
	if( retval == undefined ) retval = def;
	if(retval == "true") retval = true;
	else if(retval == "false") retval = false;
	return retval;
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