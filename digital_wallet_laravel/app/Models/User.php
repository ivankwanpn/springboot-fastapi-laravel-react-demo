<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    protected $table = 'users';

    protected $fillable = ['username', 'password_hash', 'role'];

    public $timestamps = false;

    protected $casts = [
        'id' => 'integer',
        'created_at' => 'datetime',
    ];

    public function wallet()
    {
        return $this->hasOne(Wallet::class, 'user_id');
    }
}
