<?php

namespace VigStudio\LaravelAI\Enums;

use VigStudio\LaravelAI\Connectors\OpenAIConnector;
use VigStudio\LaravelAI\Contracts\Connector;

/**
 * This is an enumeration of all possible providers
 */
enum Provider: string
{
    /**
     * The OpenAI provider. This is the only one supported at the moment.
     */
    case OpenAI = 'openai';
    // case Notion = 'notion';

    /**
     * This method returns the connector for the provider
     *
     * @return Connector The connector for the provider
     */
    public function getConnector(): Connector
    {
        return match ($this) {
            self::OpenAI => app(OpenAIConnector::class),
            // self::Notion => app(OpenAIConnector::class),
        };
    }
}
