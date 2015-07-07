var masterpw = "", syncloadcount = 0, syncsetcount = 0;
var bcrypt = new bCrypt();

$(document).ready(function() {
	var options = {};
    options.rules = {
        activated: {
            wordTwoCharacterClasses: true,
            wordRepetitions: true
        }
    };
	options.ui = {
        showVerdictsInsideProgressBar: true
    };
    $('#inputMasterPassword').pwstrength(options);
	
	if( loadval("pgpanywhere_encrypted",0)==1 )
	{
		$.getScript("/js/master_auth.js", function() {
			master_auth(function(decpw) {
				masterpw = decpw;
				$("#inputMasterPassword").val(decpw);
				$("#inputMasterPassword").pwstrength("forceUpdate");
				loadkeyrings();
			});
		});
	}
	else loadkeyrings();
	
	$("#addpgpdeckey").keyup(function() {
		var keyval = $(this).val();
		if(keyval.indexOf("-----BEGIN PGP PRIVATE KEY BLOCK-----")!=-1) $("#savekeypassword").removeAttr("disabled");
		else $("#savekeypassword").attr("disabled","disabled");
	});
	$("#selectDecKey").change(function() {
		var optval = $(this).val();
		if(optval=="addnew") 
		{
			$("#removebutton, #savekeypassword").attr("disabled","disabled");
			$("#savekeypassword, #inputEmail, #addpgpdeckey").val("");
		}
		else 
		{
			$("#removebutton").removeAttr("disabled");
			
			var infosplit = optval.split("|");
			if(infosplit[1] == "0")
			{
				var container = openkeyring("private");
				for(var i=0;i<container.length;i++) 
				{
					if( container[i].email == infosplit[0] ) 
					{
						$("#savekeypassword").val(container[i].password);
						$("#inputEmail").val(container[i].email);
						$("#addpgpdeckey").val(container[i].key);
					}
				}	
				$("#savekeypassword").removeAttr("disabled");
			}
			else 
			{
				var container = openkeyring("public");
				for(var i=0;i<container.length;i++) 
				{
					if( container[i].email == infosplit[0] ) 
					{
						$("#inputEmail").val(container[i].email);
						$("#addpgpdeckey").val(container[i].key);
					}
				}
				$("#savekeypassword").val("").attr("disabled","disabled");
			}
		}
	});
	
	$("#removebutton").click(function(e) {
		e.preventDefault();
		
		var remindex = $("#selectDecKey").val();
		var infosplit = remindex.split("|");
		if(infosplit[1] == "0") var container = openkeyring("private");
		else var container = openkeyring("public");
		for(var i=container.length-1;i>=0;i--) if( container[i].email == infosplit[0] ) container.splice(i,1);
		if(infosplit[1] == "0") savekeyring("private",container);
		else savekeyring("public",container);
		
		$("option[value='"+remindex+"']","#selectDecKey").remove();
		$("#savekeypassword, #inputEmail, #addpgpdeckey").val("");
		$("#selectDecKey").change();
	});
	$("#addbutton").click(function(e) {
		e.preventDefault();
		
		var email = $("#inputEmail").val();
		var key = $("#addpgpdeckey").val();
		if( email.indexOf("@") == -1 ) return $("#inputEmail").closest(".form-group").addClass("has-error");
		$("#inputEmail").closest(".form-group").removeClass("has-error");
		
		if( key.indexOf('-----BEGIN PGP PRIVATE KEY BLOCK-----') != -1 )
		{
			var container = openkeyring("private");
			for(var i=container.length-1;i>=0;i--) if( container[i].email == email ) container.splice(i,1);
			var addobj = {"email":email, "key":key, "password": $("#savekeypassword").val()};
			container.push(addobj);
			savekeyring("private",container);
		}
		else if( key.indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----') != -1 )
		{
			var container = openkeyring("public");
			for(var i=container.length-1;i>=0;i--) if( container[i].email == email ) container.splice(i,1);
			var addobj = {"email":email, "key":key};
			container.push(addobj);
			savekeyring("public",container);
		}
		else return $("#inputEmail").closest(".form-group").addClass("has-error");
		
		$("option","#selectDecKey").remove();
		$("#selectDecKey").append('<option value="addnew">Add new key</option>');
		loadkeyrings();
		$("#selectDecKey").change();
		$("#inputEmail, #addpgpdeckey, #savekeypassword").val("");
	});
	
	$("#flushbutton").click(function(e) { 
		e.preventDefault();
		if(confirm("Are you sure that you want to remove all data? This includes your login informations and your pgp keys!"))
		{
			chrome.storage.sync.clear();
			localStorage.clear(); 
			window.location=window.location;
		}
	});
	$("#syncbutton").click(function(e) {
		e.preventDefault();
		
		chrome.storage.sync.get("pgpanywhere_sync_set", function (sync_container) {
			if(jQuery.isEmptyObject(sync_container)) return alert("No data synced yet. Save your settings to sync them.");
			if(!confirm("Are you sure you want to override all local data with the last saved settings ("+sync_container.pgpanywhere_sync_set+")?")) return;

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
	});
	$("#submitbutton").click(function(e) {
		e.preventDefault();
		$("#submitbutton").attr("disabled","disabled");
		
		var encpw = $("#inputMasterPassword").val();
		var encrypted = encpw.length ? 1 : 0;
		var temp_public = (loadval("pgpanywhere_encrypted",0)==1) ? sjcl.decrypt(masterpw,loadval("pgpanywhere_public_keyring","[]")) : loadval("pgpanywhere_public_keyring","[]");
		var temp_private = (loadval("pgpanywhere_encrypted",0)==1) ? sjcl.decrypt(masterpw,loadval("pgpanywhere_private_keyring","[]")) : loadval("pgpanywhere_private_keyring","[]");
		temp_public = encpw.length ? sjcl.encrypt(encpw, temp_public) : temp_public;
		temp_private = encpw.length ? sjcl.encrypt(encpw, temp_private) : temp_private;
		
		masterpw = encpw;
		localStorage.setItem("pgpanywhere_encrypted", encrypted);
		localStorage.setItem("pgpanywhere_public_keyring", temp_public);
		localStorage.setItem("pgpanywhere_private_keyring", temp_private);
		chrome.runtime.sendMessage({ msg: "unlock", "auth": masterpw });
		
		if(encrypted)
		{
			var d = new Date(); 
			syncsetcount = 0;
			
			//Hash-Generierung
			var hashtype = 2; //immer bCrypt
			createhash( encpw, hashtype, function(encrypted_hash) {
				var settingscontainer = {"encrypted":encrypted, "hash":encrypted_hash};
				localStorage.setItem("pgpanywhere_encrypted_hash", encrypted_hash );
				chrome.storage.sync.set({"pgpanywhere_sync_container_settings": JSON.stringify(settingscontainer)}, function() { onsyncset(); });
				chrome.storage.sync.set({"pgpanywhere_sync_set": d.getDate()+"."+(d.getMonth()+1)+"."+d.getFullYear()}, function() { onsyncset(); });
			});
		}
		else window.close();
	});
});

function loadkeyrings()
{
	var container = openkeyring("private");
	for(var i=0;i<container.length;i++) $("#selectDecKey").append('<option value="'+container[i].email+'|0">[DEC] '+container[i].email+'</option>');
	var container = openkeyring("public");
	for(var i=0;i<container.length;i++) $("#selectDecKey").append('<option value="'+container[i].email+'|1">[ENC] '+container[i].email+'</option>');
}

function openkeyring(type)
{
	var container = loadval("pgpanywhere_"+type+"_keyring","[]");
	if(loadval("pgpanywhere_encrypted",0)==1 && container.indexOf('"iv":') != -1) container = sjcl.decrypt(masterpw,container);
	if(!container.length || container=="[]") container = [];
	else container = jQuery.parseJSON(container);
	return container;
}

function savekeyring(type,array)
{
	var container = JSON.stringify(array);
	if(loadval("pgpanywhere_encrypted",0)==1) container = sjcl.encrypt(masterpw,container);
	localStorage.setItem("pgpanywhere_"+type+"_keyring", container);
	
	if(type=="public") chrome.storage.sync.set({"pgpanywhere_sync_container_publickeys": loadval("pgpanywhere_"+type+"_keyring","{}")});
	if(type=="private") chrome.storage.sync.set({"pgpanywhere_sync_container_privatekeys": loadval("pgpanywhere_"+type+"_keyring","{}")});
}

function loadval(key,def)
{
	var retval = localStorage.getItem(key);
	if( retval == undefined ) retval = def;
	return retval;
}

function onsyncload()
{
	syncloadcount++;
	if(syncloadcount>=3) window.location = window.location;
}

function onsyncset()
{
	syncsetcount++;
	if(syncsetcount>=2) window.close();
}

function createhash(str, algo, func)
{
	if(!str.length) return func("");
	if(algo == 1) return func(getshahash(str)); //SHA512
	if(algo == 2) //bCrypt
	{
		if(!bcrypt.ready()) return setTimeout(function() { createhash(str, algo, func); }, 500);
		
		var salt;
		try{
			salt = bcrypt.gensalt(10);
			bcrypt.hashpw( str, salt, function(result) {
				return func(result);
			}, function() {});
		}catch(err){
			return alert(err);
		}
	}
}

function getshahash(str)
{
	var shaObj = new jsSHA(str, "TEXT");
	var hash = shaObj.getHash("SHA-512", "HEX");
	return hash;
}