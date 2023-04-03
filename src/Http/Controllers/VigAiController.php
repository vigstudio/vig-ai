<?php

namespace VigStudio\VigAI\Http\Controllers;

use Botble\Base\Http\Controllers\BaseController;
use Botble\Base\Http\Responses\BaseHttpResponse;
use Illuminate\Http\Request;
use VigStudio\LaravelAI\Bridges\ChatBridge;
use VigStudio\LaravelAI\Bridges\CompletionBridge;
use VigStudio\LaravelAI\Enums\Provider;
use VigStudio\LaravelAI\Models\Chat;
use Illuminate\Support\Arr;

class VigAiController extends BaseController
{
    public function completion(Request $request, BaseHttpResponse $response)
    {
        $message = $this->prompt($request->input('message'), $request->input('type'));
        $provider = Provider::from('openai');

        $completion = CompletionBridge::new()->withProvider($provider)->withModel('text-davinci-003');

        $completion->stream($message);

        $result = $completion->toArray();

        $data = [
            'external_id' => $result['external_id'],
            'prompt' => $result['prompt'],
            'message' => $result['answer'],
        ];

        return $response->setData($data)->toApiResponse();
    }

    public function chat(Request $request, BaseHttpResponse $response)
    {
        $message = $this->prompt($request->input('message'), $request->input('type'));
        $externalId = $request->input('externalId');

        $provider = Provider::from('openai');
        $chat = ChatBridge::new()->withProvider($provider)->withModel('gpt-3.5-turbo');

        // $withChat = Chat::where('external_id', $externalId)->first();
        // if ($withChat) {
        //     $chat->withChat($withChat);
        // }

        $chat->sendStream($message);

        $result = $chat->toArray();

        $lastPrompt = Arr::last(array_filter($result['messages'], function ($item) {
            return Arr::get($item, 'role') === 'user';
        }));

        $lastMessage = Arr::last(array_filter($result['messages'], function ($item) {
            return Arr::get($item, 'role') === 'assistant';
        }));

        $data = [
            'external_id' => $result['external_id'],
            'prompt' => $lastPrompt['content'],
            'message' => $lastMessage['content'],
        ];

        return $response->setData($data)->toApiResponse();
    }

    public function prompt(string $topic, string|int $type)
    {
        return match ($type) {
            '1' => "Write a blog post titled \"$topic\".
                Format the content using appropriate Markdown,
                    The content of the article should be between 1500 and 2000 words in length to ensure full information and value for readers
                    Content should contain subheadings (H2, H3) to make a difference in the article and help readers easily find the necessary information.
                    The content should be arranged in a logical sequence and have all the necessary information to answer for the reader.
                    and identify the language in which \"$topic\" is written to ensure that your blog post is written in that language.",
            '2' => "Make outline a blog post titled \"$topic\". Format the content using appropriate Markdown. and identify the language in which \"$topic\" is written to ensure that your blog post is written in that language.",
            '3' => "Brainstorm ideas on \"$topic\". Format the content using appropriate Markdown and identify the language in which \"$topic\" is written to ensure that your blog post is written in that language.",
            '4' => "Write a social media post about \"$topic\" with hashtags. Format the content using appropriate Markdown and identify the language in which \"$topic\" is written to ensure that your blog post is written in that language.",
            '5' => "Write a creative story about  \"$topic\" with content that attracts readers. Format the content using appropriate Markdown and identify the language in which \"$topic\" is written to ensure that your blog post is written in that language."
        };
    }
}
