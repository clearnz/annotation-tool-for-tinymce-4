/**
 * plugin.js
 *
 * Released under LGPL License.
 * Author Craig Housley.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/*global tinymce:true */

tinymce.PluginManager.add('annotate', function (editor, url) {
	// Add a button that opens a window
	editor.addButton('annotate', {
		//text: 'My button',
		title: 'Insert/edit annotation',
		image: url + '/img/annotation.png',
		onclick: showDialog,
		onpostrender: monitorNodeChange
	});

	editor.addButton('delete-annotation', {
		//text: 'My button',
		title: 'Remove annotation',
		image: url + '/img/delete-annotation.png',
		onclick: deleteAnnotation,
		onpostrender: monitorNodeChange
	});

	// Adds a menu item to the tools menu
	editor.addMenuItem('annotate', {
		text: 'Annotate',
		image: url + '/img/annotation.png',
		context: 'tools',
		onclick: showDialog
	});

	var selectionBookmark;

	// Highlight the annotate button if the user selects an annotation
	function monitorNodeChange() {
		var btn = this;
		editor.on('NodeChange', function (e) {
			// annotationSelected is used within this js file as well as the init function within ajaxActions.js
			btn.active(isAnnotation(editor.selection.getNode()));
			//btn.disabled(!getSelectedText() && !isAnnotation(e.element));
		});
		editor.on('dblclick', function (e) {
			if (annotationSelected = isAnnotation(e.target)) {
				btn.active(annotationSelected);
				showTooltip(e, $(e.target)[0].closest('.annotation'));
			}
		});
	}

	// Show a tooltip for the annotation on double click.
	// The div that contains the tooltip is defined in resource_descriptor_includes.php by the name of <div id="editPaperWindow"
	// The mouseout event that hides the tooltip is added on the tinymce.init function within ajax-actions.js
	function showTooltip(e, elm) {
		var tooltipText = editor.dom.getAttrib(elm, 'data-annotation-value');
		//var tagID = editor.dom.getAttrib(elm, 'data-annotation-tag');
		//var tagValue = $(".tag[data-tag-id='" + tagID + "']").data("tag-value");
		var xPos = e.clientX + Math.max(Math.round($('#canvas_ifr').offset().left) - ($('#editPaperWindow').width() / 2), 0);
		var yPos = e.clientY + Math.round($('#canvas_ifr').offset().top) - $('#editPaperWindow').height() - 30;
		if ($('#editPaperWindow').offset().left + $('#editPaperWindow').width() > $(window).width()) {
			xPos = $(window).width() - $('#editPaperWindow').width() - 30;
		}
		$('#editPaperWindow').html(HTMLfromStr(tooltipText));
		$('#editPaperWindow').css({ "left": xPos + "px", "top": yPos + "px", "display": "block" });

	}

	// Replace htmlentities with regular characters. This is for the tooltip on double-clicking an annotation.
	function HTMLfromStr(rawStr) {
		return (rawStr + "").replace(/&#\d+;/gm, function (s) {
			return String.fromCharCode(s.match(/\d+/gm)[0]);
		});
	}

	// Check whether the currently selected text is an annotation
	// jQuery 'closest' function traverses the parents looking for a node with the classname "annotation"
	// if none was found jQuery will return the first parent element, regardless of whether it contains the classname 'annotation', hence we check whether the classname exists.
	function isAnnotation(elm) {
		var tempElem = $(elm).closest('.annotation');
		return elm && ($(tempElem).hasClass("annotation")) ? true : false;
	}

	// Gets the nearest SPAN that is an annotation (e.g. the node that was clicked on might be an <em> tag within an annotation SPAN)
	// Even works for double-clicking an existing Annotation because we capture the double-click on tinymce.init within plugin.js 
	function getAnnotation(elm) {
		// Look at each parent element until we find a matching annotation SPAN
		return $(elm).closest('.annotation');
	}

	// Create an array of annotation templates that are read from a series of SPAN tags added to the dom via resource_descriptor_includes.php
	function toggleTemplates(elemID) {
		tagSelectedValue = elemID;
		templateArray = new Array();
		templateArrayPointer = -1;
		var tagTemplates = $('.tag-template[data-tag-template-id="' + elemID + '"]');
		$(tagTemplates).each(function (index, elem) {
			templateArray = ($(elem).attr('data-tag-template-value').split('|||'));
		});
	}

	// Gets called when the user clicks the annotation button in the toolbar
	function showDialog() {
		// Remove all previous bookmarks
		$(editor.dom.getRoot()).find("[data-mce-type='bookmark']").remove();
		var data = {};
		var value = "", initialText = "", selectedTag = "null";
		templateArrayPointer = -1;
		var selectedNode = editor.selection.getNode();
		annotationSelected = isAnnotation(selectedNode);
		// Check whether we have currently selected an annotation
		if (annotationSelected) {
			var selectedNode = getAnnotation(selectedNode); // Target the nearest SPAN tag that is an annotation
			editor.selection.select($(selectedNode)[0]); // move the selection to encompass the nearest annotation SPAN
			value = HTMLfromStr(editor.dom.getAttrib(selectedNode, 'data-annotation-value'));
			value = value.replace(/<br\s\/>/ig, '\n');
			initialText = data.text = $(selectedNode).html();
			selectedTag = editor.dom.getAttrib(selectedNode, 'data-annotation-tag');
		} else {
			initialText = getSelectedText() || "";
		}
		if (initialText == "") { // User must select some text before adding/editing an annotation
			editor.windowManager.alert("Please select some text or an existing annotation first.");
			return false;
		}
		// Strip </p><p> from the selected text and replace with <br /><br /> so that the annotation SPAN remains valid HTML
		data.text = pToBr(initialText);
		// Take a bookmark of the selection. tinyMCE will insert hidden SPAN tags into the DOM at the start and end points of your selection
		// We use these SPAN tags to do a string replacement with our own annotation SPAN
		selectionBookmark = editor.selection.getBookmark();
		// Create an array of objects that we will pass to the 'body' argument in windowManager.open
		// We create the multiline text field first, then append the drop-down selection list, then add the 'text to display' text field
		data.params = [];
		// If there are tags (writing features) relating to the type of annotation, create a listbox
		var tags = $('.tag');
		if (tags.length > 0) {
			var listBox = {
				type: "listbox", name: "annotationTag", label: "Writing features", onselect: function () {
					toggleTemplates(this.value());
				}, onPostRender: function () {
					// This is a workaround because the label field doesn't accept html by default. We want to show that the 'Text to display' field is compulsory by adding a red asterisk
					this.getEl().previousSibling.innerHTML = "Writing features <span style=\"color:#ff0000\">*</span>";
				}
			};
			var listBoxOptions = [{ text: "- - -", value: "null" }];
			$(tags).each(function (index, elem) {
				var selectionListItem = { text: $(elem).attr('data-tag-value'), value: $(elem).attr('data-tag-id') };
				listBoxOptions.push(selectionListItem);
			});
			listBox.values = listBoxOptions;
			// Set the preselected item in the listbox
			listBox.value = selectedTag;
			toggleTemplates(listBox.value);
			// Push the listbox onto the end of the params array
			data.params.push(listBox);
			data.params.push({
				type: 'button',
				name: 'button',
				id: 'toggleTemplatesButton',
				label: 'Templates',
				text: 'Next template',
				onclick: function (e) {
					if (!templateArray[++templateArrayPointer]) {
						templateArrayPointer = 0;
					}
					$('#annotationField').val(templateArray[templateArrayPointer]);
				}
			});
		}
		data.params.push({ type: "textbox", id: "annotationField", name: "annotationField", minWidth: 340, minHeight: 150, multiline: true, label: '', value: value });
		data.params.push({ type: "container", html: "Tip: Double-click an annotation within the editor to preview it." });
		/*data.params.push({type: "textbox", name: "textToDisplayField", size: 40, label: "Text to display", value: initialText,
								onkeyup: function() {
									// update the data.text as the user types
									data.text = this.value();
								},
								onPostRender: function() {
									// This is a workaround because the label field doesn't accept html by default. We want to show that the 'Text to display' field is compulsory by adding a red asterisk
            			    		this.getEl().previousSibling.innerHTML = "Text to display <span style=\"color:#ff0000\">*</span>";
								}
					     });*/
		editor.windowManager.open({
			title: 'Annotation',
			body: data.params,
			onsubmit: function (e) {
				var canSubmit = true; // canSubmit is set to false if the 'Text to display' field is blank o they didn't choose a writing feature from the drop-down list.
				if (typeof (tagSelectedValue) !== 'undefined') {
					if (tagSelectedValue == "null" || tagSelectedValue == "") { // the user did not select a Writing Feature for the annotation.
						editor.windowManager.alert("Please select a writing feature.");
						canSubmit = false;
						return false;
					}
				}
				if (!annotationSelected && e.data.annotationField.trim() == '') {
					editor.windowManager.alert("The annotation cannot be blank.");
					canSubmit = false;
					return false;
				}
				function createAnnotation() {
					/*if (data.text.trim() == '') {
						editor.windowManager.alert("'Text to display' cannot be blank");
						canSubmit = false;
						return false;
					}*/
					var annotationValue = strToHTML(e.data.annotationField);
					// If we are editing an existing annotation <SPAN>, just update the data-annotation-value attribute and innerHTML if necessary
					if (annotationSelected) {
						if (e.data.annotationField.trim() == '') {
							deleteAnnotation(selectedNode);
							// Collapse the selection to a caret
							editor.selection.collapse(false);
						} else {
							$(selectedNode).attr('data-annotation-value', annotationValue);
							$(selectedNode).attr('data-annotation-tag', e.data.annotationTag);
						}
						if (initialText != data.text) {
							selectedNode.innerText = data.text;
						}
					} else {
						// check whether the selection contains any nested annotations and strip them out
						// data.text = removeInnerAnnotations(data.text); // I took this out to allow nested annotations
						// Check for a leading space in the selection and put it outside the opening SPAN tag
						var leadingSpace = (data.text.search(/^\ /) == 0) ? " " : "";
						// Check for a trailing space in the selection and put it outside the closing SPAN tag
						var trailingSpace = (data.text.search(/\ $/) > 0) ? " " : "";
						// Replace quotes with HTML equivalent as strToHTML function ignores them. Only do this when creating new annotations, not editing old ones as timyMCE will replace it with &amp;quot;
						annotationValue = annotationValue.replace(/"/g, '&quot;');
						// Make the annotation string as HTML
						//console.log(selectedNode);
						//console.log(data.text);
						var replacementHTML = leadingSpace + '<span class="annotation" data-annotation-value="' + annotationValue + '" data-annotation-tag="' + e.data.annotationTag + '">' + data.text.trim() + '</span>' + trailingSpace;
						//console.log(replacementHTML);
						// Get the html of the tinyMCE body
						var bodyText = $(editor.dom.getRoot()).html();
						// Replace the text between the bookmarked SPAN tags with our own annotation SPAN
						// Replace any leading annotation SPAN and <em>s etc because the replacementHTML includes it, yet the bookmark start is added after it; we don't want to end up with three nested SPANS
						var re = /(<span class="annotation"[^>]+>)*(<em>|<i>|<strong>|<b>)?(<span data-mce-type="bookmark" id="mce_[0-9]+_start"[^>]*>).*<\/span>.*(<span data-mce-type="bookmark" id="mce_[0-9]+_end"[^>]*>).*﻿<\/span>/mi;
						// We append the bookmark SPAN so we can position the caret after the inserted annotation. Put in leading close tags for </em> and </strong> in case the selection was part way through one of these tags
						bodyText = bodyText.replace(re, "</em></strong>" + replacementHTML + "$3</span>");
						// Commit this back to tinyMCE body
						editor.dom.setHTML(editor.dom.getRoot(), bodyText);
						//$(editor.dom.getRoot()).html(bodyText);
						// Reselect the annotation so that the annotation buttons remain enabled. Doesn't work on new annotations, only when editing existing ones
						editor.selection.moveToBookmark(selectionBookmark);
					}
				}

				// We call createAnnotation() through the undoManager so that we have an undo point after the annotation is created
				function insertAnnotation() {
					editor.undoManager.transact(createAnnotation);
				}

				insertAnnotation();

				// We do not submit the form if the annotation wasn't created. The annotation won't be created if the 'Text to display' field is blank
				if (!canSubmit) {
					return false;
				}
			}
		});
	}

	// Strip out any opening SPAN tags that represent annotations from the selected text.
	// We don't worry about matching the closing spans because TinyMCE will do the cleanup.
	/*function removeInnerAnnotations(selectionString) {
		return selectionString.replace(/<span\ [^(class)]*class="annotation"[^>]*>/g, "");
	}*/
	// replace any <\p><p> tags with <br /><br /> so that it remains valid html within the annotation SPAN
	function pToBr(selectionString) {
		selectionString = selectionString.replace(/^<p>/, "");
		selectionString = selectionString.replace(/<\/p>$/, "");
		selectionString = selectionString.replace(/<\/p>[\n\s\t]*<p>/g, "<br /><br />");
		return selectionString;
	}

	// Clean up the annotation value by replacing html entities with their character codes. Replace newline characters with <br />
	function strToHTML(rawStr) {
		rawStr = rawStr.replace(/[\r\n]/g, '<br />');
		return rawStr.replace(/[\u00A0-\u9999<>\&]/gm, function (i) {
			return '&#' + i.charCodeAt(0) + ';';
		});
	}

	// Replace htmlentities with regular characters
	function HTMLfromStr(rawStr) {
		return (rawStr + "").replace(/&#\d+;/gm, function (s) {
			return String.fromCharCode(s.match(/\d+/gm)[0]);
		});
	}

	// Delete the annotation. Basically we remove the SPAN tag enclosing the text that the annotation is applied to
	function deleteAnnotation(deletionNode) {
		// deletionNode could be the click event that was triggered by clicking the deleteAnnotation icon and passed from editor.addButton, or it could be the actual annotation SPAN as passed from the function createAnnotation()
		// if the former, set deletionNode to the annotation SPAN
		if (!isAnnotation(deletionNode)) {
			deletionNode = getAnnotation(editor.selection.getNode());
			annotationSelected = isAnnotation(deletionNode);
		}
		if (annotationSelected) {
			selectedText = $(deletionNode).html();
			editor.dom.remove(deletionNode, selectedText);
			// move the caret to the end of the deleted span
			editor.selection.collapse(false);
			// store a snapshot for the undo action
			editor.undoManager.add();
		}
	}

	// Query the tinymce editor to get the selected text. If none selected, return false
	function getSelectedText() {
		return editor.selection.getContent().replace(/[\r\n]*<p>&nbsp;<\/p>$/, '') || false;
	}

});