var masterpw = "", syncloadcount = 0, syncsetcount = 0, synccounter = 0;
var bcrypt = new bCrypt();

$(document).ready(function() {
	var randParanoia = 10;
	sjcl.random = new sjcl.prng(randParanoia);
	sjcl.random.startCollectors();
	
	var options = {
		rules: {
			activated: {
				wordTwoCharacterClasses: true,
				wordRepetitions: true
			}
		},
		ui: {
			showVerdictsInsideProgressBar: true,
			verdicts: [ chrome.i18n.getMessage("verdict_weak"), chrome.i18n.getMessage("verdict_normal"), chrome.i18n.getMessage("verdict_medium"), 
						chrome.i18n.getMessage("verdict_strong"), chrome.i18n.getMessage("verdict_very_strong") ]
		}
    };
    $('#inputMasterPassword').pwstrength(options);
	
	if( loadval("pgpanywhere_encrypted",0)==1 )
	{
		$.getScript("/js/master_auth.js", function() {
			master_auth(function(decpw) {
				masterpw = decpw;
				$("#inputMasterPassword").val(decpw);
				$("#inputMasterPassword2").val(decpw);
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
			$("#addbutton").removeClass("btn-primary btn-info").addClass("btn-primary");
			
			$("#inputEmail, #addpgpdeckey").keyup();
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
			
			$("#inputEmail, #addpgpdeckey").keyup();
			$("#addbutton").removeClass("disabled btn-primary btn-info").addClass("btn-info").text(chrome.i18n.getMessage("export"));
		}
	});
	
	$("#inputMasterPassword").keyup(function() {
		$("#inputMasterPassword2").val("").show();
	});
	
	$("#inputEmail, #addpgpdeckey").keyup(function() {
		var user = $("#inputEmail").val();
		var key = $("#addpgpdeckey").val();
		var iskey = $("#selectDecKey").val();
		var enteredkey = $("#addpgpdeckey").val();
		
		if( iskey == "addnew" && user.length && !enteredkey.length ) $("#generatekey").removeClass("disabled");
		else $("#generatekey").addClass("disabled");
		
		if( user.length && key.length ) $("#addbutton").removeClass("disabled btn-primary btn-info").addClass("btn-primary").text(chrome.i18n.getMessage("save"));
		else $("#addbutton").addClass("disabled");
	});
	$("#generatekey").click(function(e) {
		e.preventDefault();
		
		var user = getAlias();
		if(!user) return;
		
		$("#addpgpdeckey, #inputEmail, #generatekey, #addbutton, #submitbutton, #flushbutton").addClass("disabled").attr("disabled", "disabled");
		var befText = $(this).html();
		$(this).html(chrome.i18n.getMessage("generating") + ' <i class="fa fa-cog fa-spin"></i>');
		
		createRandomString(function(createdString) {
			var createOptions = {
				numBits: 4096,
				userIds: [{name:user}],
				keyExpirationTime: oneYear,
				passphrase: createdString
			};
			
			openpgp.generateKey(createOptions).then(function(keypair) {
				var privkey = keypair.privateKeyArmored;
				var pubkey = keypair.publicKeyArmored;
				
				savekey(user, pubkey, "");
				savekey(user, privkey, createdString);
				
				if(confirm(chrome.i18n.getMessage("questionUploadPublicKey")))
				{
					var upk = new openpgp.HKP('https://pgp.mit.edu');
					upk.upload(pubkey).then(function() { alert(chrome.i18n.getMessage("publicKeyUploadOK")); });
				}
				
				$("#generatekey").html(befText)
				$("#addpgpdeckey, #inputEmail, #generatekey, #addbutton, #submitbutton, #flushbutton").removeClass("disabled").removeAttr("disabled");
				$("#selectDecKey").val(user+"|1").change();
			}).catch(function(error) {
				alert(error);
			});
		}, 30);
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
		
		if( $(this).hasClass("btn-primary") )
		{
			var pass = $("#savekeypassword").val();
			var email = getAlias();
			var key = $("#addpgpdeckey").val();
			if(!email) return;
			
			savekey(email, key, pass);
			$("#inputEmail, #addpgpdeckey, #savekeypassword").val("");
		}
		else
		{
			var infosplit = $("#selectDecKey").val().split("|");
			var splitlabel;
			if(infosplit[1] == "0")
			{
				$(".modal-body .well").text($("#savekeypassword").val()).show();
				$(".modal-body p").html(chrome.i18n.getMessage("export_private_desc"));
				splitlabel = "private";
			}
			else
			{
				$(".modal-body .well").text("").hide();
				$(".modal-body p").html(chrome.i18n.getMessage("export_public_desc"));
				splitlabel = "public";
			}
			$("#downloadKey").attr("download", $("#inputEmail").val()+'.'+splitlabel+'.asc').attr("href", 'data:text/plain;base64,'+btoa($("#addpgpdeckey").val()));
			
			if($("#savekeypassword").val().length) $(".modal-body .well").show();
			else $(".modal-body .well").hide();
			$(".modal").show();
		}
	});
	$(".modal-header .close, .modal-footer .btn-default").click(function() {
		$(".modal").hide();
		$(".modal-body .well").text("");
	});
	$("#flushbutton").click(function(e) {
		e.preventDefault();
		if(confirm(chrome.i18n.getMessage("delete_confirm")))
		{
			chrome.storage.sync.clear();
			localStorage.clear(); 
			window.location=window.location;
		}
	});
	$("#submitbutton").click(function(e) {
		e.preventDefault();
		
		var encpw = $("#inputMasterPassword").val();
		if( encpw != $("#inputMasterPassword2").val() ) return alert(chrome.i18n.getMessage("password_no_match"));
		var encrypted = encpw.length ? 1 : 0;
		var temp_public = (loadval("pgpanywhere_encrypted",0)==1) ? sjcl.decrypt(masterpw,loadval("pgpanywhere_public_keyring","[]")) : loadval("pgpanywhere_public_keyring","[]");
		var temp_private = (loadval("pgpanywhere_encrypted",0)==1) ? sjcl.decrypt(masterpw,loadval("pgpanywhere_private_keyring","[]")) : loadval("pgpanywhere_private_keyring","[]");
		temp_public_save = encpw.length ? sjcl.encrypt(encpw, temp_public) : temp_public;
		temp_private_save = encpw.length ? sjcl.encrypt(encpw, temp_private) : temp_private;
		
		$("#submitbutton").attr("disabled","disabled");
		masterpw = encpw;
		localStorage.setItem("pgpanywhere_encrypted", encrypted);
		localStorage.setItem("pgpanywhere_public_keyring", temp_public_save);
		localStorage.setItem("pgpanywhere_private_keyring", temp_private_save);
		chrome.runtime.sendMessage({ msg: "unlock", "auth": masterpw });
		
		if(encrypted)
		{
			var d = new Date(); 
			syncsetcount = 0;
			
			// Hash-Generation
			var hashtype = 2; //always bCrypt
			createhash( encpw, hashtype, function(encrypted_hash) {
				var settingscontainer = {"encrypted":encrypted, "hash":encrypted_hash};
				localStorage.setItem("pgpanywhere_encrypted_hash", encrypted_hash );
				
				addSyncElement(6);
				chrome.storage.sync.set({"pgpanywhere_sync_container_settings": JSON.stringify(settingscontainer)}, function() { onsyncset(); });
				
				// Public Keys
				var container = openkeyring("public");
				addSyncElement(container.length);
				for(var i=0;i<container.length;i++)
				{
					var enc_item = sjcl.encrypt(encpw, JSON.stringify(container[i]));
					var sync_label = "pgpanywhere_sync_public_"+i;
					var sync_item = {};
					sync_item[sync_label] = enc_item;
					chrome.storage.sync.set(sync_item, function() { onsyncset(); });
				}
				chrome.storage.sync.set({"pgpanywhere_sync_public_list": container.length}, function() { onsyncset(); });
				
				// Private Keys
				var container = openkeyring("private");
				addSyncElement(container.length);
				for(var i=0;i<container.length;i++)
				{
					var enc_item = sjcl.encrypt(encpw, JSON.stringify(container[i]));
					var sync_label = "pgpanywhere_sync_private_"+i;
					var sync_item = {};
					sync_item[sync_label] = enc_item;
					chrome.storage.sync.set(sync_item, function() { onsyncset(); });
				}
				chrome.storage.sync.set({"pgpanywhere_sync_private_list": container.length}, function() { onsyncset(); });
				
				// Empty container from older versions
				chrome.storage.sync.remove("pgpanywhere_sync_container_publickeys", function() { onsyncset(); });
				chrome.storage.sync.remove("pgpanywhere_sync_container_privatekeys", function() { onsyncset(); });
				
				var timestamp = Math.floor(Date.now() / 1000);
				chrome.storage.sync.set({"pgpanywhere_sync_set": timestamp}, function() { onsyncset(); });
			});
		}
		else window.close();
	});
});

function savekey(email, key, pass)
{
	if( key.indexOf('-----BEGIN PGP PRIVATE KEY BLOCK-----') != -1 )
	{
		var container = openkeyring("private");
		for(var i=container.length-1;i>=0;i--) if( container[i].email == email ) container.splice(i,1);
		var addobj = {"email":email, "key":key, "password": pass};
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
	else alert(chrome.i18n.getMessage("invalid_key"));
	
	$("#selectDecKey").html('');
	$("#selectDecKey").append('<option value="addnew">'+chrome.i18n.getMessage("add_key")+'</option>');
	loadkeyrings();
	$("#selectDecKey").change();
}

function getAlias()
{
	var user = $("#inputEmail").val();
	if(!user.length)
	{
		var bef = $("#inputEmail").css("border");
		$("#inputEmail").css("border","1px solid red");
		alert(chrome.i18n.getMessage("require_identity"));
		$("#inputEmail").css("border",bef);
		return false;
	}
	return user;
}

function loadkeyrings()
{
	var container = openkeyring("private");
	if(container.length)
	{
		$("#selectDecKey").append('<optgroup label="'+chrome.i18n.getMessage("private_key_label")+'" id="privateKeyGroup"></div>');
		for(var i=0;i<container.length;i++) $("#privateKeyGroup").append('<option value="'+container[i].email+'|0">'+container[i].email+'</option>');
	}
	
	var container = openkeyring("public");
	if(container.length)
	{
		$("#selectDecKey").append('<optgroup label="'+chrome.i18n.getMessage("public_key_label")+'" id="publicKeyGroup"></div>');
		for(var i=0;i<container.length;i++) $("#publicKeyGroup").append('<option value="'+container[i].email+'|1">'+container[i].email+'</option>');
	}
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
}

function loadval(key,def)
{
	var retval = localStorage.getItem(key);
	if( retval == undefined ) retval = def;
	return retval;
}

function addSyncElement(add)
{
	synccounter+=add;
}

function onsyncset()
{
	syncsetcount++;
	if(syncsetcount>=synccounter) window.close();
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

function createRandomString (callback, length) {
  var randomBase64String = '',
  checkReadyness;

  checkReadyness = setInterval(function () {
    if(sjcl.random.isReady(10)) {
      while(randomBase64String.length < length) {
        randomInt = sjcl.random.randomWords(1, 10)[0];
        randomBase64String += btoa(randomInt);
      }
      randomBase64String = randomBase64String.substr(0, length);
      callback(randomBase64String);
      clearInterval(checkReadyness);
    }
  }, 1);
}
