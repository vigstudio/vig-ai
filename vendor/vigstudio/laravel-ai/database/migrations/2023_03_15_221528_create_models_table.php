<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vig_ai_models', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_active')->default(false);
            $table->string('provider');
            $table->string('external_id');
            $table->string('name');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vig_ai_models');
    }
};
