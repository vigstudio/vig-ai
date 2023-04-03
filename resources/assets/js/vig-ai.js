import EditorJS from '@editorjs/editorjs';
import List from '@editorjs/list';
import NestedList from '@editorjs/nested-list';
import ImageTool from '@editorjs/image';
import Header from '@editorjs/header';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import DragDrop from 'editorjs-drag-drop';
import Undo from 'editorjs-undo';
import BlockAi from './block-ai.js';
import * as cheerio from 'cheerio';
const showdown = require('showdown');

let externalId = null;
let promptType = 1;

const editor = new EditorJS({
    autofocus: true,
    onReady: () => {
        new DragDrop(editor);
        new Undo({
            editor
        });
    },
    tools: {
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
    },
    debug: false
});

function splitBlock(content) {
    var converter = new showdown.Converter();
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
                const ulItems = $(el).find('li');
                const ulData = ulItems.map((j, item) => $(item).html()).get();
                blocks.push({
                    type: 'list',
                    data: {
                        style: 'unordered',
                        items: ulData
                    }
                });
                break;
            case 'ol':
                const olItems = $(el).find('li');
                const olData = olItems.map((j, item) => $(item).html()).get();
                blocks.push({
                    type: 'list',
                    data: {
                        style: 'ordered',
                        items: olData
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
        const blocks = outputData.blocks;
        const outputHtml = [];

        blocks.forEach((block) => {
            console.log(block.type);
            switch (block.type) {
                case 'paragraph':
                    outputHtml.push(`<p>${block.data.text}</p>`);
                    break;
                case 'header':
                    outputHtml.push(`<h${block.data.level}>${block.data.text}</h${block.data.level}>`);
                    break;
                case 'quote':
                    outputHtml.push(`<blockquote>${block.data.text}</blockquote>`);
                    break;
                case 'image':
                    outputHtml.push(`<img src="${block.data.file.url}" alt="${block.data.caption}" />`);
                    break;
                case 'list':
                    if (block.data?.style === 'unordered') {
                        outputHtml.push('<ul>');
                    } else if (block.data?.style === 'ordered') {
                        outputHtml.push('<ol>');
                    }
                    block.data?.items?.forEach((item) => {
                        outputHtml.push(`<li>${item}</li>`);
                    });
                    if (block.data?.style === 'unordered') {
                        outputHtml.push('</ul>');
                    } else if (block.data?.style === 'ordered') {
                        outputHtml.push('</ol>');
                    }
                    break;
                default:
                    outputHtml.push(`<p>${block.data.text}</p>`);
                    break;
            }
        });

        const fullHtml = outputHtml.join('');

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
