<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $table = 'transactions';

    protected $fillable = ['from_wallet_id', 'to_wallet_id', 'amount', 'tx_type', 'status'];

    public $timestamps = false;

    protected $casts = [
        'id' => 'integer',
        'from_wallet_id' => 'integer',
        'to_wallet_id' => 'integer',
        'amount' => 'decimal:4',
        'created_at' => 'datetime',
    ];
}
