import { useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import {
  findBrackets,
  insertChordAtCursor,
  insertSectionAtCursor,
  isValidChord,
  chordProToSong,
} from '../utils/chordpro';
import { SongRenderer } from './SongRenderer';

const MONO_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const SECTION_OPTIONS = [
  'Intro',
  'Verso 1',
  'Verso 2',
  'Pre-estribillo',
  'Estribillo',
  'Puente',
  'Solo',
  'Outro',
  'Final',
];

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function ChordProEditor({ value, onChangeText, placeholder }: Props) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Validacion: encontrar [X] donde X parece intentar ser acorde pero no es valido.
  // No marcamos los [Verso] etc. como invalidos porque son secciones legitimas.
  const { invalidChords, totalChords, totalSections } = useMemo(() => {
    const brackets = findBrackets(value);
    const invalid: string[] = [];
    let chords = 0;
    let sections = 0;
    for (const b of brackets) {
      if (b.isChord) {
        chords++;
      } else if (b.isSection) {
        // Heuristica: si parece que el usuario quiso un acorde
        // (empieza con A-G + tal vez # o b) pero no es valido → flag
        if (/^[A-G][#b]?\S*$/.test(b.content) && !b.content.includes(' ')) {
          invalid.push(b.content);
        } else {
          sections++;
        }
      }
    }
    return { invalidChords: invalid, totalChords: chords, totalSections: sections };
  }, [value]);

  // Preview: intentamos parsear; si falla, mostramos el error
  const previewResult = useMemo(() => {
    if (!showPreview) return null;
    try {
      return { ok: true as const, song: chordProToSong(value) };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }, [showPreview, value]);

  const handleSelectionChange = (
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    setSelection(e.nativeEvent.selection);
  };

  const handleAddChord = () => {
    const { text, cursor } = insertChordAtCursor(value, selection.start);
    onChangeText(text);
    // Reposicionar cursor dentro del []
    setTimeout(() => {
      inputRef.current?.setNativeProps({ selection: { start: cursor, end: cursor } });
      setSelection({ start: cursor, end: cursor });
    }, 10);
  };

  const handleAddSection = (sectionLabel: string) => {
    const { text, cursor } = insertSectionAtCursor(value, selection.start, sectionLabel);
    onChangeText(text);
    setShowSectionPicker(false);
    setTimeout(() => {
      inputRef.current?.setNativeProps({ selection: { start: cursor, end: cursor } });
      setSelection({ start: cursor, end: cursor });
    }, 10);
  };

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          onPress={handleAddChord}
          style={[styles.toolBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.toolBtnText, { color: '#000' }]}>+ Acorde</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowSectionPicker(true)}
          style={[styles.toolBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
        >
          <Text style={[styles.toolBtnText, { color: theme.colors.textPrimary }]}>+ Sección</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => setShowPreview(true)}
          style={[styles.toolBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
        >
          <Text style={[styles.toolBtnText, { color: theme.colors.textPrimary }]}>👁 Vista previa</Text>
        </Pressable>
      </View>

      {/* Hint */}
      <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
        Escribí la letra. Donde vaya un acorde poné [C], [Am], [F#m7], etc. Las secciones van en su propia línea: [Verso], [Estribillo], etc.
      </Text>

      {/* TextInput principal */}
      <TextInput
        ref={inputRef}
        style={[
          styles.textInput,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.textPrimary,
            borderColor: theme.colors.border,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder ?? 'Escribí acá tu canción...'}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        textAlignVertical="top"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />

      {/* Estado de validacion */}
      <View style={styles.statusRow}>
        <Text style={[styles.statusText, { color: theme.colors.textMuted }]}>
          {totalChords} acordes · {totalSections} secciones
        </Text>
        {invalidChords.length > 0 && (
          <Text style={[styles.statusText, { color: theme.colors.danger }]} numberOfLines={1}>
            ⚠️ {invalidChords.length} inválido(s): {invalidChords.slice(0, 3).join(', ')}
            {invalidChords.length > 3 ? '...' : ''}
          </Text>
        )}
      </View>

      {/* Modal: selector de seccion */}
      <Modal
        visible={showSectionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSectionPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowSectionPicker(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Insertar sección
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {SECTION_OPTIONS.map((sec) => (
                <Pressable
                  key={sec}
                  onPress={() => handleAddSection(sec)}
                  style={[styles.sectionOption, { borderBottomColor: theme.colors.border }]}
                >
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 15 }}>
                    [{sec}]
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setShowSectionPicker(false)}
              style={[styles.modalCloseBtn, { backgroundColor: theme.colors.surfaceAlt }]}
            >
              <Text style={{ color: theme.colors.textPrimary }}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Modal: vista previa */}
      <Modal
        visible={showPreview}
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={[styles.previewContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.previewHeader, { borderBottomColor: theme.colors.border }]}>
            <Pressable onPress={() => setShowPreview(false)} hitSlop={12}>
              <Text style={[styles.previewClose, { color: theme.colors.primary }]}>
                ✕ Cerrar
              </Text>
            </Pressable>
            <Text style={[styles.previewTitle, { color: theme.colors.textPrimary }]}>
              Vista previa
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {!previewResult ? null : !previewResult.ok ? (
              <View style={[styles.previewError, { borderColor: theme.colors.danger }]}>
                <Text style={[styles.previewErrorTitle, { color: theme.colors.danger }]}>
                  ⚠️ No se puede previsualizar
                </Text>
                <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
                  {previewResult.error}
                </Text>
              </View>
            ) : (
              <View>
                <Text style={[styles.previewMeta, { color: theme.colors.textPrimary }]}>
                  {previewResult.song.title}
                </Text>
                <Text style={[styles.previewMetaSub, { color: theme.colors.textSecondary }]}>
                  {previewResult.song.artist} · Tono: {previewResult.song.originalKey}
                </Text>
                <View style={{ height: 16 }} />
                <SongRenderer
                  song={{
                    _id: 'preview',
                    title: previewResult.song.title,
                    artist: previewResult.song.artist,
                    artistSlug: '',
                    titleSlug: '',
                    originalKey: previewResult.song.originalKey,
                    capo: previewResult.song.capo ?? 0,
                    difficulty: previewResult.song.difficulty ?? 'intermedio',
                    sections: previewResult.song.sections,
                    views: 0,
                    status: 'draft',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }}
                  fontSize={14}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  toolBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolBtnText: { fontSize: 13, fontWeight: '600' },
  hint: { fontSize: 11, paddingHorizontal: 12, paddingVertical: 6 },
  textInput: {
    flex: 1,
    marginHorizontal: 12,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: MONO_FONT,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  statusText: { fontSize: 11 },
  // Modal seccion
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  sectionOption: { paddingVertical: 12, borderBottomWidth: 1 },
  modalCloseBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  // Modal preview
  previewContainer: { flex: 1 },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  previewClose: { fontSize: 15, fontWeight: '600' },
  previewTitle: { fontSize: 15, fontWeight: '600' },
  previewMeta: { fontSize: 20, fontWeight: 'bold' },
  previewMetaSub: { fontSize: 14, marginTop: 4 },
  previewError: { borderWidth: 1, borderRadius: 8, padding: 16 },
  previewErrorTitle: { fontSize: 16, fontWeight: 'bold' },
});
