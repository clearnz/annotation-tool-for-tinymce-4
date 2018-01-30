# annotation-tool-for-tinymce-4
Annotate text and images within TinyMCE 4 editor.
This plugin adds an annotation tool to the plugins directory. The user highlights a word or phrase within the TinyMCE editor and clicks the annotation icon in the toolbar. A popup window allows the author to input text as the annotation. The annotated text will appear as a yellow highlight and can be edited by clicking anywhere within the highlight and clicking the annotation icon again.

The tool basically wraps the highlighted text in a SPAN tag and the annotation text is saved as an attribute of the SPAN tag, eg.

	<span class="annotation" data-annotation-value="Whatever you typed">The text that you highlighted</span>



To include the annotation icons within the TinyMCE toolbar you must add this code to the init function:

	// activate tinymce editor on the textarea with id="canvas".
	// Notice the addition of annotate and delete-annotation in the plugins and toolbar attributes.
	tinymce.init({
		selector: '#canvas',
		width : 1000,
		height:800,
		plugins: 'advlist autolink lists link image charmap print preview anchor searchreplace
			visualblocks code fullscreen insertdatetime media table contextmenu paste annotate',
		toolbar: "insertfile undo redo | styleselect | bold italic underline subscript superscript | 
			alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | 
			link unlink image table | annotate delete-annotation | code",
		content_css : 'css/style.css',
		init_instance_callback: function (editor) { // when user double-clicks on an annotation SPAN, select the entire SPAN
			editor.on('DblClick', function (e) {
				try {
					if (annotationSelected) {
						// Convert the target element of the click event into a native dom element, hence [0], then look at each parent element until we find a matching annotation SPAN editor.selection.select($(e.target)[0].closest('.annotation'));
					}
				 } catch (err) { }
			});
			editor.on('MouseOut', function (e) {
				hideTooltip();
			});
		 	editor.on('keyup', function (e) {
				 textChanged = true;
			});
		}
	});
	function hideTooltip() {
		$('#editPaperWindow').css("display", "none");
	}


And add the following selector to your stylesheet, otherwise the annotated text won't have the yellow highlight.

	.annotation {
		background: url('../javascript/tinymce/plugins/annotate/img/transparent-yellow.png') transparent;
	}
  
On the public-facing website, the annotation can be read using jQuery, eg.

	var annotations = $(".annotation");
	annotations.each( function() {
		var annotationText = $(this).attr('data-annotation-value');
	});

You can see a working demo at
https://flexiblelearning.auckland.ac.nz/tinymcedemo/annotations/
