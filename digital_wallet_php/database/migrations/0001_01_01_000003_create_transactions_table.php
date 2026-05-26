<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_wallet_id')->nullable()->constrained('wallets')->onDelete('set null');
            $table->foreignId('to_wallet_id')->nullable()->constrained('wallets')->onDelete('set null');
            $table->decimal('amount', 18, 4);
            $table->string('tx_type', 20);
            $table->string('status', 20)->default('SUCCESS');
            $table->timestamp('created_at')->useCurrent();

            $table->index('from_wallet_id');
            $table->index('to_wallet_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
