import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, Keyboard } from 'react-native';

type SearchBarProps = {
  suggestions?: string[];
  placeholder?: string;
  onSelect?: (value: string) => void;
};

export default function SearchBar({ suggestions = [], placeholder = 'Search trails, towns...', onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const filtered = suggestions
      .filter(s => s.toLowerCase().includes(q))
      .slice(0, 6);
    setResults(filtered);
  }, [query, suggestions]);

  const clear = () => {
    setQuery('');
    setResults([]);
    Keyboard.dismiss();
  };

  const handleSelect = (val: string) => {
    setQuery(val);
    setResults([]);
    if (onSelect) onSelect(val);
    Keyboard.dismiss();
  };

  const renderItem = ({ item }: { item: string }) => (
    <TouchableOpacity onPress={() => handleSelect(item)} style={styles.suggestionRow} accessibilityRole="button">
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        style={styles.input}
        clearButtonMode="while-editing"
        accessibilityLabel={placeholder}
      />

      {results.length > 0 && (
        <View style={styles.suggestions}>
          <FlatList data={results} keyboardShouldPersistTaps="handled" keyExtractor={i => i} renderItem={renderItem} />
        </View>
      )}

      {query ? (
        <TouchableOpacity onPress={clear} style={styles.clear} accessibilityRole="button">
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Make the search bar compact and centered
  wrapper: { width: 320, alignSelf: 'center', marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    fontSize: 16,
  },
  suggestions: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    maxHeight: 220,
  },
  suggestionRow: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  suggestionText: { fontSize: 15, color: '#222' },
  // clear button positioned relative to the wrapper/input
  clear: { position: 'absolute', right: 18, top: 12 },
  clearText: { color: '#007AFF', fontWeight: '600' },
});
