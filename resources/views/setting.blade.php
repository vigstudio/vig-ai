<div class="flexbox-annotated-section">
    <div class="flexbox-annotated-section-annotation">
        <div class="annotated-section-title pd-all-20">
            <h2>{{ trans('plugins/vig-ai::vig-ai.name') }}</h2>
        </div>
        <div class="annotated-section-description pd-all-20 p-none-t">
            <p class="color-note">{{ trans('plugins/vig-ai::vig-ai.description') }}</p>
        </div>
    </div>

    <div class="flexbox-annotated-section-content">
        <div class="wrapper-content pd-all-20">
            <div class="form-group mb-3">
                <div class="form-group mb-3">
                    <label class="text-title-field">{{ trans('plugins/vig-ai::vig-ai.openai_api_key') }}</label>
                    <input data-counter="120" type="text" class="next-input"
                           placeholder="{{ trans('plugins/vig-ai::vig-ai.openai_api_key_placeholder') }}"
                           value="{{ setting('vig_openai_api_key', '') }}" name="vig_openai_api_key">
                </div>
            </div>

        </div>
    </div>
</div>
