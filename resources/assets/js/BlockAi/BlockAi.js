import * as cheerio from 'cheerio';
import * as showdown from 'showdown';
require('showdown-twitter');

class BlockAi {
    constructor({data, api}) {
        this.api = api;
        this.data = data;
        this.wrapper = undefined;
        this.loadingIconSvg = undefined;
        this.isLoading = false;
    }

    static get toolbox() {
        return {
            icon: '<i class="fa-solid fa-robot"></i>',
            title: 'Ask AI (Beta)',
            category: 'text',
        };
    }

    render() {
        this.wrapper = document.createElement('div');
        const input = document.createElement('textarea');

        this.wrapper.classList.add('block-ai');
        this.wrapper.classList.add('form-group');
        this.wrapper.appendChild(input);

        input.classList.add('form-control');
        input.classList.add('block-ai-input');
        input.placeholder = 'Type your text here...';
        input.value = this.data && this.data.url ? this.data.url : '';

        this.loadingIconSvg = this.createLoadingIcon();
        this.wrapper.appendChild(this.loadingIconSvg);

        return this.wrapper;
    }

    createLoadingIcon() {
        const svg = document.createElement('div');
        svg.innerHTML = '<b><i>Asking AI.......</i></b>';
        svg.style.display = 'none';

        return svg;
    }

    showLoading() {
        this.isLoading = true;
        const input = this.wrapper.querySelector('textarea');
        input.remove();
        this.loadingIconSvg.style.display = 'inline-block';
    }

    hideLoading() {
        this.isLoading = false;
        this.loadingIconSvg.style.display = 'none';
    }

    /**
    * Quá mệt mỏi với cái save này
    * ̿̿ ̿̿ ̿̿ ̿'̿'\̵͇̿̿\з= ( ▀ ͜͞ʖ▀) =ε/̵͇̿̿/’̿’̿ ̿ ̿̿ ̿̿ ̿̿
    */
    save() {
        if (this.isLoading) {
            return {};
        }

        const input = this.wrapper.querySelector('.block-ai-input');
        const text = input ? input.value.trim() : '';
        let output = '';
        if (!text) {
            this.hideLoading();
            return null;
        }

        this.showLoading();
        const externalId = this.getExternalId('vig_ai_external_id');
        $.ajax({
            type: 'POST',
            url: window.VigAiRoute.chat,
            data: {
                '_token': window.VigAiRoute.csrf,
                'message': text,
                'externalId': externalId,
                'type': 99
            },
            success: res => {
                this.hideLoading();
                if (!res.error) {
                    output = res.data.message;
                    this.setExternalId('vig_ai_external_id', res.data.external_id);
                    this.insertBlock(output);

                } else {
                    Botble.showError(res.message);
                }
            }
        });

        return output;
    }

    insertBlock(text) {
        const blocks = this.splitBlock(text);
        let indexBlock = this.api.blocks.getCurrentBlockIndex()
        this.api.blocks.delete(indexBlock);
        blocks.forEach((block, index) => {
            let defaultBlockData = this.api.blocks.composeBlockData(block.type);
            let location = indexBlock + index;
            let blockDataOverrides = block.data;
            let blockData = Object.assign(defaultBlockData, blockDataOverrides);

            this.api.blocks.insert(block.type, blockData, undefined, location, undefined, false);
        });

    }

    splitBlock(content) {
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
                            items: this.parseList($(el))
                        }
                    });
                    break;
                case 'ol':
                    blocks.push({
                        type: 'list',
                        data: {
                            style: 'ordered',
                            items: this.parseList($(el))
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

    parseList($list) {
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
                    "items": this.parseList($el)
                });
            } else if (el.tagName.toLowerCase() === 'ol') {
                items.push({
                    "content": $el.text(),
                    "items": this.parseList($el)
                });
            }
        });
        return items;
    }

    setExternalId(key, value) {
        const now = new Date().getTime();
        const item = {value: value, expiry: now + 3600000}; // 1 hour from now
        localStorage.setItem(key + '-' + window.VigAiRoute.uuid, JSON.stringify(item));
    }

    getExternalId(key) {
        const item = JSON.parse(localStorage.getItem(key + '-' + window.VigAiRoute.uuid));
        if (!item) {
            return null;
        }
        const now = new Date().getTime();
        if (now > item.expiry) {
            localStorage.removeItem(key + '-' + window.VigAiRoute.uuid);
            return null;
        }
        return item.value;
    }
}
export default BlockAi;
