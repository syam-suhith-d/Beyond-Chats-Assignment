<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Article;

class ArticleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Article::all();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'content' => 'nullable|string',
            'original_url' => 'required|url|unique:articles,original_url',
            'source_citations' => 'nullable|array',
            'is_updated' => 'boolean'
        ]);

        return Article::create($validated);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return Article::findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $article = Article::findOrFail($id);
        $article->update($request->all());
        return $article;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        Article::findOrFail($id)->delete();
        return response()->noContent();
    }
}
