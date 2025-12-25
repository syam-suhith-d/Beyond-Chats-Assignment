<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Article extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'content',
        'original_url',
        'source_citations',
        'is_updated',
    ];

    protected $casts = [
        'source_citations' => 'array',
        'is_updated' => 'boolean',
    ];
}
