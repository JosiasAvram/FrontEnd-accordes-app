import { useState } from 'react';
import { TextInput, View, StyleSheet, Pressable, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  initialValue?: string;
  onSubmit: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ initialValue = '', onSubmit, placeholder, autoFocus }: Props) {
  const theme = useTheme();
  const [value, setValue] = useState(initialValue);

  const submit = () => {
    if (value.trim()) onSubmit(value.trim());
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.icon, { color: theme.colors.textMuted }]}>🔍</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.textPrimary }]}
        placeholder={placeholder ?? 'Buscar artista o canción...'}
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        returnKeyType="search"
        autoFocus={autoFocus}
      />
      {value.length > 0 && (
        <Pressable onPress={() => setValue('')}>
          <Text style={[styles.clear, { color: theme.colors.textMuted }]}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  icon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 16 },
  clear: { fontSize: 16, padding: 4 },
});
