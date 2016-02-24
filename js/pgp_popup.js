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
	
	$("#decpgptxt").keyup(function() {
		if( $(this).val().length ) $("#submitbutton").removeClass("disabled");
		else $("#submitbutton").addClass("disabled");
		$("#decpgptxt").closest(".form-group").removeClass("has-error");
	});
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
	$("#selectDecKey").change(function() { onkeysel(); });
	$("#submitbutton").click(function(e) {
		e.preventDefault();
		
		var encindex = $("#selectDecKey").val();
		var infosplit = encindex.split("|");
		
		var toenc = $("#decpgptxt").val();
		if( !toenc.length || ( infosplit[1] == "0" && toenc.indexOf('-----BEGIN PGP MESSAGE-----') ) ) return $("#decpgptxt").closest(".form-group").addClass("has-error");
		$("#decpgptxt").closest(".form-group").removeClass("has-error");
		
		var befText = $(this).html();
		$(this).html(chrome.i18n.getMessage("processing")+' <i class="fa fa-cog fa-spin"></i>').addClass("disabled");
		
		if(infosplit[1] == "0")
		{
			var container = openkeyring("private");
			var key = "";
			var keypass = "";
			for(var i=0;i<container.length;i++) 
			{
				if(container[i].email==infosplit[0]) 
				{
					key=container[i].key;
					keypass=container[i].password;
					break;
				}
			}
			if( !key.length ) return alert(chrome.i18n.getMessage("internal_key_error"));
			var privateKey = openpgp.key.readArmored(key).keys[0];
			var retdec = privateKey.decrypt(keypass);
			if(retdec === false) return alert(chrome.i18n.getMessage("key_pass_error"));
			pgpMessage = openpgp.message.readArmored(toenc);
			openpgp.decryptMessage(privateKey, pgpMessage).then(function(plaintext) {
				$("#submitbutton").html(befText).removeClass("disabled");
				$("#decpgptxt").val(plaintext);
			}).catch(function(error) {
				$("#submitbutton").html(befText).removeClass("disabled");
				alert("Error: "+error);
			});
		}
		else
		{
			var container = openkeyring("public");
			var key = "";
			for(var i=0;i<container.length;i++) if(container[i].email==infosplit[0]) key=container[i].key;
			if( !key.length ) return alert(chrome.i18n.getMessage("internal_key_error")+" - "+infosplit[0]);
			var publicKey = openpgp.key.readArmored(key).keys[0];
			openpgp.encryptMessage(publicKey, toenc).then(function(pgpMessage) {
				$("#submitbutton").html(befText).removeClass("disabled");
				$("#decpgptxt").val(pgpMessage);
			}).catch(function(error) {
				$("#submitbutton").html(befText).removeClass("disabled");
				alert("Error: "+error);
			});
		}
	});
	$("#expandbutton").click(function() {
		$(this).blur();
		sizestate = !sizestate;
		if(sizestate)
		{
			$(this).html('<i class="fa fa-compress"></i>');
			$("#decpgptxt").animate({"height":"275px"});
			$("#popupdiv").animate({"width":"600px","height":"450px"});
		}
		else
		{
			$(this).html('<i class="fa fa-arrows-alt"></i>');
			$("#decpgptxt").animate({"height":"100px"});
			$("#popupdiv").animate({"width":"300px","height":"270px"});
		}
	});
});

function onkeysel()
{
	$("#decpgptxt").closest(".form-group").removeClass("has-error");
	if($("#selectDecKey").val()=="addnew")
	{
		$("#submitbutton").attr("disabled","disabled");
	}
	else 
	{
		$("#submitbutton").removeAttr("disabled");
		if( $("#selectDecKey").val().indexOf("|0") == -1) $("#submitbutton").text(chrome.i18n.getMessage("encrypt"));
		else $("#submitbutton").text(chrome.i18n.getMessage("decrypt"));
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