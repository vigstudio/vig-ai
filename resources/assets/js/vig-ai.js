import EditorJS from '@editorjs/editorjs';
import NestedList from '@editorjs/nested-list';
import ImageTool from '@editorjs/image';
import Header from '@editorjs/header';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import Embed from '@editorjs/embed';
import DragDrop from 'editorjs-drag-drop';
import Undo from 'editorjs-undo';
import CodeTool from '@editorjs/code';
import * as cheerio from 'cheerio';
import * as showdown from 'showdown';
import * as edjsHTML from 'editorjs-html';
require('showdown-twitter');

//VigAi Block
import BlockAi from './BlockAi/BlockAi';

let externalId = null;
let promptType = 1;
let editor;

document.addEventListener("DOMContentLoaded", function (event) {
    editor = new EditorJS({
        holder: 'editorjs-vig-ai',
        autofocus: true,
        onReady: () => {
            new DragDrop(editor);
            new Undo({
                editor
            });
        },
        tools: {
            ai: {
                class: BlockAi,
                inlineToolbar: true,
            },
            header: {
                class: Header,
                shortcut: 'CMD+SHIFT+H',
                config: {
                    placeholder: 'Enter a header',
                    levels: [2, 3, 4],
                    defaultLevel: 2
                }
            },
            delimiter: {
                class: Delimiter,
            },
            list: {
                class: NestedList,
                inlineToolbar: true,
                config: {
                    defaultStyle: 'unordered'
                },
            },
            quote: {
                class: Quote,
                inlineToolbar: true,
                shortcut: 'CMD+SHIFT+O',
                config: {
                    quotePlaceholder: 'Enter a quote',
                    captionPlaceholder: 'Quote\'s author',
                },
            },
            image: {
                class: ImageTool,
                config: {
                    additionalRequestHeaders: {
                        "X-CSRF-TOKEN": window.VigAiRoute.csrf,
                    },
                    uploader: {
                        uploadByFile(file) {
                            let form_data = new FormData();
                            form_data.append('_token', window.VigAiRoute.csrf);
                            form_data.append('file[]', file);

                            return $.ajax({
                                type: 'POST',
                                url: window.VigAiRoute.upload_media,
                                cache: false,
                                contentType: false,
                                processData: false,
                                data: form_data,
                            }).then(function (data) {
                                return {
                                    success: 1,
                                    file: {
                                        url: data.data.src,
                                    }
                                };
                            });
                        },
                    }
                }
            },
            embed: Embed,
            code: CodeTool,

        },
        logLevel: 'ERROR',
        placeholder: 'Let`s write an awesome story!'
    });
});

function splitBlock(content) {
    var converter = new showdown.Converter({extensions: ['twitter']});
    const html = converter.makeHtml(content);
    const $ = cheerio.load(html);
    const blocks = [];

    $('body').children().each((i, el) => {
        switch (el.tagName.toLowerCase()) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                blocks.push({
                    type: 'header',
                    data: {
                        text: $(el).html(),
                        level: parseInt(el.tagName[1])
                    }
                });
                break;
            case 'img':
                blocks.push({
                    type: 'image',
                    data: {
                        url: $(el).attr('src'),
                        caption: $(el).attr('alt')
                    }
                });
                break;
            case 'blockquote':
                blocks.push({
                    type: 'quote',
                    data: {
                        text: $(el).html()
                    }
                });
                break;

            case 'ul':
                blocks.push({
                    type: 'list',
                    data: {
                        style: 'unordered',
                        items: parseList($(el))
                    }
                });
                break;
            case 'ol':
                blocks.push({
                    type: 'list',
                    data: {
                        style: 'ordered',
                        items: parseList($(el))
                    }
                });
                break;
            default:
                blocks.push({
                    type: 'paragraph',
                    data: {
                        text: $(el).html()
                    }
                });
                break;
        }
    });

    return blocks;
}

function parseList($list) {
    const items = [];
    $list.children().each((i, el) => {
        const $el = $(el);

        if (el.tagName.toLowerCase() === 'li') {
            items.push({
                "content": $el.text(),
                "items": []
            });
        } else if (el.tagName.toLowerCase() === 'ul') {
            items.push({
                "content": $el.text(),
                "items": parseList($el)
            });
        } else if (el.tagName.toLowerCase() === 'ol') {
            items.push({
                "content": $el.text(),
                "items": parseList($el)
            });
        }
    });
    return items;
}

function ajaxAi(button, ask) {
    $(button).prop('disabled', true).addClass('button-loading');
    $.ajax({
        type: 'POST',
        url: window.VigAiRoute.completion,
        data: {
            '_token': window.VigAiRoute.csrf,
            'message': ask,
            'externalId': externalId,
            'type': promptType
        },
        success: res => {
            if (!res.error) {
                const blocks = splitBlock(res.data.message);
                editor.render({
                    blocks
                });

                externalId = res.data.external_id;
            } else {
                Botble.showError(res.message);
            }

            $(button).prop('disabled', false).removeClass('button-loading');
        },
        error: res => {
            $(button).prop('disabled', false).removeClass('button-loading');
            Botble.handleError(res + ' ' + res.status);
            if (res.status === 504) {
                Botble.handleError('The system is requesting again');
                ajaxAi(button, ask);
            }
        },
    });
}

$(document).on('change', '#completion-select-type', function (event) {
    event.preventDefault();
    event.stopPropagation();
    promptType = $(this).val();
});

$(document).on('click', '.btn-vig-ai-completion', function (event) {
    event.preventDefault();
    event.stopPropagation();
    let ask = $('#completion-ask').val();
    ajaxAi(this, ask);
});

$(document).on('click', '.vig-import-editor', function (event) {

    if (Object.keys(window.EDITOR.CKEDITOR).length !== 0) {
        window.EDITOR.CKEDITOR['content'].setData('');
    }

    if (typeof window.tinyMCE !== 'undefined' && typeof window.tinyMCE.activeEditor !== 'undefined') {
        window.tinyMCE.activeEditor.setContent('');
    }

    editor.save().then((outputData) => {
        const edjsParser = edjsHTML();
        const html = edjsParser.parse(outputData);
        const fullHtml = html.join('');
        if (Object.keys(window.EDITOR.CKEDITOR).length !== 0) {
            window.EDITOR.CKEDITOR['content'].setData(fullHtml);
        }

        if (typeof window.tinyMCE !== 'undefined' && typeof window.tinyMCE.activeEditor !== 'undefined') {
            window.tinyMCE.activeEditor.setContent(fullHtml);
        }
    }).catch((error) => {
        console.error('Error:', error);
    });

});

$(document).on('click', '.btn-submit-model', function (event) {
    event.preventDefault();
    event.stopPropagation();
    $(this).prop('disabled', true).addClass('button-loading');
    $.ajax({
        type: 'POST',
        url: route('vig-ai.importModel'),
        data: {
            '_token': window.VigAiRoute.csrf,
        },
        success: res => {
            if (res.error) {
                Botble.showError(res.message)
                $(this).prop('disabled', false).removeClass('button-loading');
            } else {
                Botble.showSuccess(res.message);
                setTimeout(() => {
                    window.location.reload();
                    $(this).prop('disabled', false).removeClass('button-loading');
                }, 1000);

            }

        },
        error: res => {
            $(this).prop('disabled', false).removeClass('button-loading');
            Botble.handleError(res + ' ' + res.status);
        },
    });
});

