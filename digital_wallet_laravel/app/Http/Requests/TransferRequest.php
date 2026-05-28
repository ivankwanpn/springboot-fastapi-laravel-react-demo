<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'toUsername' => 'required|string|min:3',
            'amount' => ['required', 'regex:/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/'],
        ];
    }
}
