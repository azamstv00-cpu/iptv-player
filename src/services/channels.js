import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';

const COL = 'channels';

export async function fetchChannels() {
  const q = query(collection(db, COL), orderBy('channelNumber'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addChannel(data) {
  return addDoc(collection(db, COL), {
    ...data,
    channelNumber: Number(data.channelNumber),
    createdAt: new Date()
  });
}

export async function updateChannel(id, data) {
  const clean = { ...data };
  if (clean.channelNumber != null) clean.channelNumber = Number(clean.channelNumber);
  delete clean.id;
  delete clean.createdAt;
  return updateDoc(doc(db, COL, id), clean);
}

export async function deleteChannel(id) {
  return deleteDoc(doc(db, COL, id));
}

export async function reindexChannels() {
  const snap = await getDocs(collection(db, COL));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (a.name || '').localeCompare(b.name || '') || (a.channelNumber || 0) - (b.channelNumber || 0));
  const updates = [];
  docs.forEach((d, i) => {
    const num = i + 1;
    if (d.channelNumber !== num) updates.push(updateDoc(doc(db, COL, d.id), { channelNumber: num }));
  });
  await Promise.all(updates);
  if (updates.length) docs.forEach((d, i) => { d.channelNumber = i + 1; });
  return docs;
}
