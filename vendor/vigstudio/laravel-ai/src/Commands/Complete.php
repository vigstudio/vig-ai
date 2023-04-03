<?php

namespace VigStudio\LaravelAI\Commands;

use Illuminate\Console\Command;
use VigStudio\LaravelAI\Bridges\CompletionBridge;
use VigStudio\LaravelAI\Contracts\ConsoleProviderDependent;

class Complete extends Command
{
    use ConsoleProviderDependent;

    protected $signature = 'ai:complete {--stream}';

    protected $description = 'Use the AI to complete your prompt';

    /**
     * @throws \Exception
     */
    public function handle(): void
    {
        $provider = $this->askForProvider();

        while (1) {
            $message = $this->ask('You');
            if ($message === 'exit') {
                break;
            }

            $completion = CompletionBridge::new()
                ->withProvider($provider)
                ->withModel('text-davinci-003');

            if ($this->option('stream')) {
                $this->newLine();
                $this->info('AI: ');
                $result = $completion->stream($message);
                $this->newLine();
            } else {
                $result = $completion->complete($message);
                $this->info('AI: '.$result);
            }
        }
    }
}
