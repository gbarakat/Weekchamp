import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { addMonths, LIFE_AREAS, type Goal, type LifeArea, type Project } from './logic';
import { colors } from './theme';
import { Chip, DateField, shared } from './ui';

export type ProjectDraft = Pick<Project, 'name' | 'startDate' | 'endDate' | 'area' | 'goalId'>;

type Props = {
  visible: boolean;
  project: Project | null; // null = creating a new project
  taskCount: number; // tasks that would be deleted with the project
  goals: Goal[];
  todayKey: string;
  onSave: (draft: ProjectDraft) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function ProjectEditor({
  visible,
  project,
  taskCount,
  goals,
  todayKey,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [area, setArea] = useState<LifeArea | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(project?.name ?? '');
    setStartDate(project?.startDate ?? todayKey);
    setEndDate(project ? project.endDate : null);
    setArea(project?.area ?? null);
    setGoalId(project?.goalId ?? null);
    setConfirmDelete(false);
  }, [visible, project, todayKey]);

  const trimmed = name.trim();
  const datesOk = endDate === null || endDate >= startDate;
  const canSave = trimmed.length > 0 && datesOk;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{project ? 'Edit project' : 'New project'}</Text>

            <Text style={shared.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Learn Arabic calligraphy"
              placeholderTextColor={colors.muted}
              style={shared.input}
              maxLength={50}
              autoFocus={!project}
              accessibilityLabel="Project name"
            />

            <Text style={shared.label}>Start date</Text>
            <DateField label="Start" value={startDate} onChange={setStartDate} />

            <Text style={shared.label}>End date</Text>
            <View style={shared.wrap}>
              <Chip label="No end date" active={endDate === null} onPress={() => setEndDate(null)} />
              <Chip
                label="Set an end date"
                active={endDate !== null}
                onPress={() => setEndDate(endDate ?? addMonths(startDate, 1))}
              />
            </View>
            {endDate !== null && (
              <View style={styles.endDate}>
                <DateField label="End" value={endDate} onChange={setEndDate} />
              </View>
            )}
            {!datesOk && (
              <Text style={styles.problem}>The end date is before the start date.</Text>
            )}

            <Text style={shared.label}>Life area (optional)</Text>
            <View style={shared.wrap}>
              <Chip label="None" active={area === null} onPress={() => setArea(null)} accessibilityLabel="No life area" />
              {LIFE_AREAS.map((a) => (
                <Chip
                  key={a.id}
                  label={`${a.emoji} ${a.label}`}
                  active={area === a.id}
                  onPress={() => setArea(a.id)}
                  accessibilityLabel={`Life area ${a.label}`}
                />
              ))}
            </View>

            <Text style={shared.label}>Ultimate goal (optional)</Text>
            {goals.length === 0 ? (
              <Text style={shared.caption}>Add an ultimate goal in the Goals tab to link it here.</Text>
            ) : (
              <View style={shared.wrap}>
                <Chip label="None" active={goalId === null} onPress={() => setGoalId(null)} accessibilityLabel="No goal" />
                {goals.map((g) => (
                  <Chip
                    key={g.id}
                    label={`🎯 ${g.name}`}
                    active={goalId === g.id}
                    onPress={() => setGoalId(g.id)}
                    accessibilityLabel={`Goal ${g.name}`}
                  />
                ))}
              </View>
            )}

            <Pressable
              disabled={!canSave}
              onPress={() => onSave({ name: trimmed, startDate, endDate, area, goalId })}
              style={[styles.save, !canSave && shared.disabled]}
              accessibilityRole="button"
            >
              <Text style={styles.saveText}>{project ? 'Save changes' : 'Add project'}</Text>
            </Pressable>

            {project && (
              <Pressable
                onPress={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
                style={styles.plain}
                accessibilityRole="button"
              >
                <Text style={styles.deleteText}>
                  {confirmDelete
                    ? `Tap again to delete the project and its ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`
                    : 'Delete project'}
                </Text>
              </Pressable>
            )}

            <Pressable onPress={onClose} style={styles.plain} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(21,23,43,0.45)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  endDate: { marginTop: 10 },
  problem: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 8 },
  save: {
    marginTop: 22,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  plain: { marginTop: 4, paddingVertical: 12, alignItems: 'center' },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  cancelText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
});
