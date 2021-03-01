var sizestate = false;

$(document).ready(function() {
	if(loadval("pgpanywhere_encrypted",0)==1)
	{
		$.getScript("/js/master_auth.js", function() {
			master_auth(function(decpw) {
				loadkeyrings();
			});
		});
	}
	else loadkeyrings();
	
	$("#decpgptxt").keyup(onkeysel);
	$("#addbutton").click(function(e) {
		e.preventDefault();
		
		var email = $("#inputEmail").val();
		var key = $("#addpgpdeckey").val();
		if( email.indexOf("@") == -1 ) return $("#inputEmail").closest(".form-group").addClass("has-error");
		if( key.indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----') == -1 ) return $("#addpgpdeckey").closest(".form-group").addClass("has-error");
		$("#addpgpdeckey").closest(".form-group").removeClass("has-error");
		var container = openkeyring("public");
		var addobj = {"email":email, "key":key};
		container.push(addobj);
		savekeyring("public",container);
		
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
			var container = openkeyring("private");
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
			var privateKey = (await openpgp.key.readArmored(goKey)).keys[0];
			var pgpMessage = await openpgp.message.readArmored(toenc);
			privateKey.decrypt(keypass).then(function(retdec) {
				openpgp.decrypt({message:pgpMessage, privateKeys:privateKey}).then(function(plaintext) {
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
			var container = openkeyring("public");
			var goKey = "";
			for(var i=0;i<container.length;i++) if(container[i].email==infosplit[0]) goKey=container[i].key;
			if( !goKey.length ) return showAlert(chrome.i18n.getMessage("internal_key_error"), 1);
			var publicKey = (await openpgp.key.readArmored(goKey)).keys; //[0]
			if( typeof publicKey == 'undefined' ) 
			{
				$("#submitbutton").html(befText).removeClass("disabled");
				return showAlert(chrome.i18n.getMessage("key_incompatible"), 1);
			}
			openpgp.encrypt({message: openpgp.message.fromText(toenc), publicKeys: publicKey[0]}).then(function(pgpMessage) {
				$("#submitbutton").html(befText).removeClass("disabled");
				$("#decpgptxt").val(pgpMessage.data);
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
			var container = openkeyring("private");
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
			var privateKey = (await openpgp.key.readArmored(goKey)).keys[0];
			privateKey.decrypt(keypass).then(function(retdec) {
				openpgp.sign({message:openpgp.message.fromText(toenc), privateKeys:privateKey}).then(function(signed) {
					$("#altbutton").html(befText).removeClass("disabled");
					$("#decpgptxt").val(signed.data.trim());
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
			var container = openkeyring("public");
			var goKey = "";
			for(var i=0;i<container.length;i++) if(container[i].email==infosplit[0]) goKey=container[i].key;
			if( !goKey.length ) return showAlert(chrome.i18n.getMessage("internal_key_error"), 1);
			var publicKey = (await openpgp.key.readArmored(goKey)).keys; //[0]
			if( typeof publicKey == 'undefined' ) 
			{
				$("#altbutton").html(befText).removeClass("disabled");
				return showAlert(chrome.i18n.getMessage("key_incompatible"), 1);
			}
			var pgpMessage = await openpgp.message.readArmored(toenc);
			openpgp.verify({message: pgpMessage, publicKeys: publicKey}).then(function(sigCheck) {
				//console.log("sigCheck", sigCheck);
				$("#altbutton").html(befText).removeClass("disabled");
				if(sigCheck.data.length && sigCheck.signatures[0].valid && sigCheck.signatures[0].keyid.toHex() == publicKey[0].primaryKey.keyid.toHex())
				{
					showAlert(chrome.i18n.getMessage("sig_matches"), 2);
					var insideText = new TextDecoder("utf-8").decode(sigCheck.data);
					$("#decpgptxt").val(insideText.trim());
					onkeysel();
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
	
	if( $("option","#selectDecKey").length > 1 ) $("#addnew").remove();
	onkeysel();
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

function showAlert(content, type)
{
	$(".popupOutput").text(content).removeClass("text-danger text-success");
	if(type == 1) $(".popupOutput").addClass("text-danger");
	if(type == 2) $(".popupOutput").addClass("text-success");
}