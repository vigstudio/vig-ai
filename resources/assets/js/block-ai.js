class BlockAi {
    static get toolbox() {
        return {
            title: 'BlockAi',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18 10v4H6v-4H4v6h16v-6h-2zM5.5 5l-.5.5v9l.5.5h13l.5-.5v-9l-.5-.5h-13zM7 7h10v1H7zM7 9h10v1H7z"/></svg>'
        };
    }

    constructor({data, api}) {
        this.data = data;
        this.api = api;
    }

    render() {
        return document.createElement('input');
    }

    save() {
        return {
            data: this.data,
        };
    }
}
