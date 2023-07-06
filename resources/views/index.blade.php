<div class="d-inline-block editor-action-item">
    <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#vig-ai-content-modal">
        <i class="fa-solid fa-robot"></i> {{ trans('plugins/vig-ai::vig-ai.button_show') }}
    </button>
</div>


<div class="modal fade"
     id="vig-ai-content-modal"
     tabindex="-1"
     aria-hidden="true">

    <div class="modal-dialog modal-xl" style="min-width: 80vw;">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">{{ trans('plugins/vig-ai::vig-ai.name') }}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="modal-vig-ai-body">
                <div class="row">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-body">
                                <div class="row">
                                    @if (empty(config('laravel-ai.openai.api_key')))
                                        <div class="alert alert-danger" role="alert">
                                            {{ trans('plugins/vig-ai::vig-ai.alert_api') }}
                                        </div>
                                    @endif

                                    @if ($count_model > 0)
                                        <div class="col-md-12 mb-3">
                                            <div class="form-group">
                                                <label class="control-label">{{ trans('plugins/vig-ai::vig-ai.select_type_prompt') }}</label>
                                                <select class="form-control" value="" id="completion-select-type">
                                                    <option value="1">{{ trans('plugins/vig-ai::vig-ai.select_1') }}</option>
                                                    <option value="2">{{ trans('plugins/vig-ai::vig-ai.select_2') }}</option>
                                                    <option value="3">{{ trans('plugins/vig-ai::vig-ai.select_3') }}</option>
                                                    <option value="4">{{ trans('plugins/vig-ai::vig-ai.select_4') }}</option>
                                                    <option value="5">{{ trans('plugins/vig-ai::vig-ai.select_5') }}</option>
                                                    <option value="6">{{ trans('plugins/vig-ai::vig-ai.select_6') }}</option>
                                                    <option value="7">{{ trans('plugins/vig-ai::vig-ai.select_7') }}</option>
                                                    <option value="7">{{ trans('plugins/vig-ai::vig-ai.select_8') }}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div class="col-md-12 mb-3">
                                            <div class="form-group">
                                                <label class="control-label">{{ trans('plugins/vig-ai::vig-ai.prompt') }}</label>
                                                <textarea type="text" class="form-control" value="" id="completion-ask"></textarea>
                                            </div>
                                        </div>
                                        <div class="col-md-12 mb-3">
                                            <button type="button" class="btn btn-primary btn-vig-ai-completion">{{ trans('plugins/vig-ai::vig-ai.completion_get') }}</button>
                                        </div>
                                    @endif

                                    @if (!empty(config('laravel-ai.openai.api_key')) && $count_model == 0)
                                        <div class="alert alert-danger" role="alert">
                                            {{ trans('plugins/vig-ai::vig-ai.model-alert') }}<br />
                                            <form action="{{ route('vig-ai.importModel') }}" method="POST">
                                                @csrf
                                                <button type="button" class="btn btn-success btn-submit-model" type="submit">{{ trans('plugins/vig-ai::vig-ai.import') }}</button>
                                            </form>

                                        </div>
                                    @endif

                                    <div class="col-md-12">
                                        <div id="editorjs-vig-ai"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">{{ trans('plugins/vig-ai::vig-ai.close') }}</button>
                <button type="button" class="btn btn-primary vig-import-editor" data-bs-dismiss="modal">{{ trans('plugins/vig-ai::vig-ai.import_to_editor') }}</button>
            </div>
        </div>
    </div>
</div>

@push('header')
    <script>
        window.VigAiRoute = {
            uuid: "{{ Str::uuid() }}",
            completion: "{{ route('vig-ai.completion') }}",
            chat: "{{ route('vig-ai.chat') }}",
            upload_media: "{{ route('media.files.upload') }}",
            upload_url: "{{ route('media.download_url') }}",
            csrf: "{{ csrf_token() }}"
        };
    </script>
@endpush
