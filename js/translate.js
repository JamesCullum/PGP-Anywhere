$(document).ready(function() {
	$("title, .l18n").each(function() {
		var contentHTML = $(this).html();
		$(this).html(translate(contentHTML));
		
		var placeholder = $(this).attr("placeholder");
		if( placeholder ) $(this).attr("placeholder", translate(placeholder) );
		
		var title = $(this).attr("title");
		if( title ) $(this).attr("title", translate(title) );
	});
});

function translate(htmlIN)
{
	var valNewH = htmlIN.replace(/__MSG_(\w+)__/g, function(match, v1) {
		if(!v1)
		{
			console.error("Missing translation for "+v1);
			return "MISSING TRANSLATION";
		}
		return chrome.i18n.getMessage(v1);
	});
	return valNewH;
}