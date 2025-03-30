<?php

namespace VigStudio\LaravelAI\Commands;

use Exception;
use Illuminate\Console\Command;
use VigStudio\LaravelAI\Bridges\ChatBridge;
use VigStudio\LaravelAI\Contracts\ConsoleProviderDependent;

class Chat extends Command
{
    use ConsoleProviderDependent;

    protected $signature = 'ai:chat {--stream}';

    protected $description = 'Chat with AI';

    /**
     * @throws Exception
     */
    public function handle(): void
    {
        $provider = $this->askForProvider();

        $chat = ChatBridge::new()->withProvider($provider)->withModel('gpt-4o-mini');

        while (1) {
            $message = $this->ask('You');
            if ($message === 'exit') {
                break;
            }

            if ($this->option('stream')) {
                $this->newLine();
                $this->info('AI: ');
                ob_start();
                $stream = $chat->sendStream($message);
                foreach ($stream as $chunk) {
                    echo $chunk;
                    ob_flush();
                }
                ob_end_flush();
                $this->newLine();
            } else {
                $this->info('AI: '.$chat->send($message));
            }
        }
    }
}
