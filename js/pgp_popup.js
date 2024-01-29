var sizestate = false;

$(document).ready(async function() {
	if(await loadval("pgpanywhere_encrypted", 0) == 1)
	{
		master_auth(async function(decpw) {
			await loadkeyrings();
		});
	}
	else await loadkeyrings();
	
	$("#decpgptxt").keyup(onkeysel);
	$("#addbutton").click(async function(e) {
		e.preventDefault();
		
		var email = $("#inputEmail").val();
		var key = $("#addpgpdeckey").val();
		if( email.indexOf("@") == -1 ) return $("#inputEmail").closest(".form-group").addClass("has-error");
		if( key.indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----') == -1 ) return $("#addpgpdeckey").closest(".form-group").addClass("has-error");
		$("#addpgpdeckey").closest(".form-group").removeClass("has-error");
		var container = await openkeyring("public");
		var addobj = {"email":email, "key":key};
		container.push(addobj);
		await savekeyring("public",container);
		
		$("#selectDecKey").append('<option value="'+email+'">'+email+'</option>').val(email).change();
		$("#inputEmail, #addpgpdeckey").val("");
	});
	$("#editbutton").click(function(e) {
		e.preventDefault();
		window.open("/html/options.html");
	});
	$("#selectDecKey").change(onkeysel);
	$("#submitbutton").click(async function(e) {
		e.preventDefault();
		showAlert("", 0);
		
		var encindex = $("#selectDecKey").val();
		var infosplit = encindex.split("|");
		
		var toenc = $("#decpgptxt").val();
		if( !toenc.length || ( infosplit[1] == "0" && toenc.indexOf(' MESSAGE-----') == -1 ) ) return $("#decpgptxt").closest(".form-group").addClass("has-error");
		$("#decpgptxt").closest(".form-group").removeClass("has-error");
		
		var befText = $(this).html();
		$(this).html(chrome.i18n.getMessage("processing")+' <i class="fa fa-cog fa-spin"></i>').addClass("disabled");
		
		if(infosplit[1] == "0")
		{
			var container = await openkeyring("private");
			var goKey = "";
			var keypass = "";
			for(var i=0;i<container.length;i++) 
			{
				if(container[i].email==infosplit[0]) 
				{
					goKey=container[i].key;
					keypass=container[i].password;
					break;
				}
			}
			if( !goKey.length ) return showAlert(chrome.i18n.getMessage("internal_key_error"), 1);
			const readPrivateKey = await openpgp.readPrivateKey({ armoredKey: goKey });
			var pgpMessage = await openpgp.readMessage({ armoredMessage: toenc });

			openpgp.decryptKey({ privateKey: readPrivateKey, passphrase: keypass}).then(function(privateKey) {
				openpgp.decrypt({
					message: pgpMessage,
					decryptionKeys: privateKey
				}).then(function(plaintext) {
					$("#submitbutton").html(befText).removeClass("disabled");
					$("#decpgptxt").val(plaintext.data);
					onkeysel();
				}).catch(function(error) {
					$("#submitbutton").html(befText).removeClass("disabled");
					showAlert(error, 1);
				});
			}).catch(function(error){
				$("#submitbutton").html(befText).removeClass("disabled");				
				showAlert(error, 1);
			});
		}
		else
		{
			var container = await openkeyring("public");
			var goKey = "";
			for(var i=0;i<container.length;i++) if(container[i].email==infosplit[0]) goKey=container[i].key;
			if( !goKey.length ) return showAlert(chrome.i18n.getMessage("internal_key_error"), 1);
			const publicKey = await openpgp.readKey({ armoredKey: goKey });

			if( typeof publicKey == 'undefined' ) 
			{
				$("#submitbutton").html(befText).removeClass("disabled");
				return showAlert(chrome.i18n.getMessage("key_incompatible"), 1);
			}
			openpgp.encrypt({
				message: await openpgp.createMessage({ text: toenc }),
				encryptionKeys: publicKey
			}).then(function(pgpMessage) {
				$("#submitbutton").html(befText).removeClass("disabled");
				$("#decpgptxt").val(pgpMessage);
				onkeysel();
			}).catch(function(error) {
				$("#submitbutton").html(befText).removeClass("disabled");
				showAlert(error, 1);
			});
		}
	});
	$("#altbutton").click(async function(e) {
		e.preventDefault();
		showAlert("", 0);
		
		var encindex = $("#selectDecKey").val();
		var infosplit = encindex.split("|");
		
		var toenc = $("#decpgptxt").val();
		if( !toenc.length || (infosplit[1] == "1" && toenc.indexOf(' MESSAGE-----') == -1)) return $("#decpgptxt").closest(".form-group").addClass("has-error");
		if(infosplit[1] == "0" && toenc.indexOf(' MESSAGE-----') != -1) return showAlert(chrome.i18n.getMessage("sign_then_encrypt"), 1);
		$("#decpgptxt").closest(".form-group").removeClass("has-error");
		
		var befText = $(this).html();
		$(this).html(chrome.i18n.getMessage("processing")+' <i class="fa fa-cog fa-spin"></i>').addClass("disabled");
		
		if(infosplit[1] == "0")
		{
			var container = await openkeyring("private");
			var goKey = "";
			var keypass = "";
			for(var i=0;i<container.length;i++) 
			{
				if(container[i].email==infosplit[0]) 
				{
					goKey=container[i].key;
					keypass=container[i].password;
					break;
				}
			}
			if( !goKey.length ) return showAlert(chrome.i18n.getMessage("internal_key_error"), 1);
			const readPrivateKey = await openpgp.readPrivateKey({ armoredKey: goKey });
			const clearMessage = await openpgp.createCleartextMessage({ text: toenc });
			openpgp.decryptKey({ privateKey: readPrivateKey, passphrase: keypass}).then(function(privateKey) {
				openpgp.sign({
					message: clearMessage,
					signingKeys: privateKey
				}).then(function(signed) {
					$("#altbutton").html(befText).removeClass("disabled");
					$("#decpgptxt").val(signed.trim());
					onkeysel();
				}).catch(function(error) {
					$("#altbutton").html(befText).removeClass("disabled");
					showAlert(error, 1);
				});
			}).catch(function(error) {
				$("#altbutton").html(befText).removeClass("disabled");				
				showAlert(error, 1);
			});
		}
		else
		{
			var container = await openkeyring("public");
			var goKey = "";
			for(var i=0;i<container.length;i++) if(container[i].email==infosplit[0]) goKey=container[i].key;
			if( !goKey.length ) return showAlert(chrome.i18n.getMessage("internal_key_error"), 1);
			const publicKey = await openpgp.readKey({ armoredKey: goKey });
			if( typeof publicKey == 'undefined' ) 
			{
				$("#altbutton").html(befText).removeClass("disabled");
				return showAlert(chrome.i18n.getMessage("key_incompatible"), 1);
			}
			var pgpMessage = await openpgp.readCleartextMessage({ cleartextMessage: toenc });
			openpgp.verify({message: pgpMessage, verificationKeys: publicKey}).then(function(sigCheck) {
				$("#altbutton").html(befText).removeClass("disabled");

				if(!sigCheck.data.length || !sigCheck.signatures) return showAlert(chrome.i18n.getMessage("sig_invalid"), 1);

				const { verified, keyID } = sigCheck.signatures[0];
				if(keyID.toHex() == publicKey.getKeyID().toHex())
				{
					verified.then(() => {
						showAlert(chrome.i18n.getMessage("sig_matches"), 2);
						$("#decpgptxt").val(sigCheck.data.trim());
						onkeysel();
					}).catch(err => {
						console.log("verified", err)
						showAlert(chrome.i18n.getMessage("sig_invalid"), 1);
					});
				}
				else showAlert(chrome.i18n.getMessage("sig_invalid"), 1);
			});
		}
	});
	$("#expandbutton").click(function(e) {
		e.preventDefault();
		window.open("/html/popup.html");
	});
	if( $(window).height() > $("#popupdiv").outerHeight()+100 || $(window).width() > $("#popupdiv").outerWidth()+100 ) 
	{
		$("nav.navbar").show();
		$("#popupdiv").addClass("well").css("margin-top","60px");
		$("#popupdiv > form").addClass("form-horizontal");
		$("#decpgptxt").css("height","300px");
	}
});

function onkeysel()
{
	var toenc = $("#decpgptxt").val();
	$("#decpgptxt").closest(".form-group").removeClass("has-error");
	$("#submitbutton, #altbutton").addClass("disabled");
	
	if($("#selectDecKey").val()!="addnew")
	{
		if( $("#selectDecKey").val().indexOf("|0") == -1)
		{
			$("#submitbutton").text(chrome.i18n.getMessage("encrypt"));
			$("#altbutton").text(chrome.i18n.getMessage("verify"));
			
			if(toenc.length) $("#submitbutton").removeClass("disabled");
			if(toenc.indexOf(" MESSAGE-----") != -1) $("#altbutton").removeClass("disabled");
		}
		else
		{
			$("#submitbutton").text(chrome.i18n.getMessage("decrypt"));
			$("#altbutton").text(chrome.i18n.getMessage("sign"));
			
			if(toenc.length) $("#altbutton").removeClass("disabled");
			if(toenc.indexOf("-----BEGIN PGP MESSAGE-----") != -1) $("#submitbutton").removeClass("disabled");
		}
	}
}

async function loadkeyrings()
{
	var container = await openkeyring("private");
	if(container.length)
	{
		$("#selectDecKey").append('<optgroup label="'+chrome.i18n.getMessage("private_key_label")+'" id="privateKeyGroup"></div>');
		for(var i=0;i<container.length;i++) $("#privateKeyGroup").append('<option value="'+container[i].email+'|0">'+container[i].email+'</option>');
	}
	
	var container = await openkeyring("public");
	if(container.length)
	{
		$("#selectDecKey").append('<optgroup label="'+chrome.i18n.getMessage("public_key_label")+'" id="publicKeyGroup"></div>');
		for(var i=0;i<container.length;i++) $("#publicKeyGroup").append('<option value="'+container[i].email+'|1">'+container[i].email+'</option>');
	}
	
	if( $("option","#selectDecKey").length > 1 ) $("#addnew").remove();
	onkeysel();
}

async function openkeyring(type)
{
	var container = await loadval("pgpanywhere_"+type+"_keyring","[]");
	if(await loadval("pgpanywhere_encrypted",0)==1 && container.indexOf('"iv":') != -1) container = sjcl.decrypt(masterpw,container);
	if(!container.length || container=="[]") container = [];
	else container = jQuery.parseJSON(container);
	return container;
}

async function savekeyring(type,array)
{
	var container = JSON.stringify(array);
	if(await loadval("pgpanywhere_encrypted",0)==1) container = sjcl.encrypt(masterpw,container);
	await setval("pgpanywhere_"+type+"_keyring", container);
	
	if(type=="public") chrome.storage.sync.set({"pgpanywhere_sync_container_publickeys": await loadval("pgpanywhere_"+type+"_keyring","{}")});
	if(type=="private") chrome.storage.sync.set({"pgpanywhere_sync_container_privatekeys": await loadval("pgpanywhere_"+type+"_keyring","{}")});
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

function showAlert(content, type)
{
	$(".popupOutput").text(content).removeClass("text-danger text-success");
	if(type == 1) $(".popupOutput").addClass("text-danger");
	if(type == 2) $(".popupOutput").addClass("text-success");
}