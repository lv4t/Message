import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCshXn7IODTSOYN-pVfpb0oQB3paV-g2fY",
  authDomain: "note-403a3.firebaseapp.com",
  projectId: "note-403a3",
  storageBucket: "note-403a3.firebasestorage.app",
  messagingSenderId: "275737348339",
  appId: "1:275737348339:web:8f06bde76454b18deccf86",
  measurementId: "G-MJHR5BHX03"
};

const appId = 'so-luu-but-cong-khai';

let app, auth, db, userId;
let currentEditId = null;

// --- DOM ELEMENTS ---
const addMessageForm = document.getElementById('add-message-form');
const messageInput = document.getElementById('message-input');
const messageList = document.getElementById('message-list');
const loadingIndicator = document.getElementById('loading-indicator');
const authInfo = document.getElementById('auth-info');

const editModal = document.getElementById('edit-modal');
const editMessageInput = document.getElementById('edit-message-input');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const messagesCollectionPath = `artifacts/${appId}/public/data/messages`;

async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                // *** THAY ĐỔI 1: Ẩn ID người dùng ở header ***
                authInfo.innerHTML = `<p class="italic">If you know you know.</p>`;
                listenForMessages();
            } else {
                signInAnonymously(auth).catch(error => {
                    console.error("Authentication failed:", error);
                    authInfo.textContent = 'Lỗi xác thực.';
                });
            }
        });
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        authInfo.textContent = 'Lỗi khởi tạo.';
        loadingIndicator.textContent = 'Không thể kết nối.';
    }
}

function listenForMessages() {
    const messagesCollection = collection(db, messagesCollectionPath);
    
    onSnapshot(messagesCollection, (snapshot) => {
        loadingIndicator.style.display = 'none';
        
        if (snapshot.empty) {
            messageList.innerHTML = '<p class="text-center text-gray-500 py-8 italic">Chưa có lời nhắn nào. Hãy là người đầu tiên!</p>';
            return;
        }

        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        messages.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        messageList.innerHTML = '';
        
        messages.forEach(msg => {
            const messageElement = createMessageElement(msg);
            messageList.appendChild(messageElement);
        });
    }, (error) => {
        console.error("Error fetching messages: ", error);
        messageList.innerHTML = '<p class="text-center text-red-500 py-8">Lỗi tải lời nhắn.</p>';
    });
}

function createMessageElement(msg) {
    const { id, text, createdAt, authorId } = msg;
    const card = document.createElement('div');
    card.className = 'message-card p-4 rounded-r-lg flex justify-between items-start';
    card.setAttribute('data-id', id);

    const date = createdAt ? new Date(createdAt.seconds * 1000).toLocaleString('vi-VN') : 'Vừa xong';
    const isAuthor = userId === authorId;

    const actionButtons = isAuthor ? `
        <div class="flex flex-col space-y-2 ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="edit-btn p-1 rounded-full hover:bg-amber-100 transition duration-150" title="Sửa">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
            </button>
            <button class="delete-btn p-1 rounded-full hover:bg-red-100 transition duration-150" title="Xóa">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
    ` : '';

    // *** THAY ĐỔI 2: Ẩn ID người gửi trong mỗi lời nhắn ***
    card.innerHTML = `
        <div>
            <p class="text-gray-800 whitespace-pre-wrap">${text}</p>
            <small class="text-gray-400 text-xs mt-2 block italic">
                Gửi lúc: ${date}
            </small>
        </div>
        ${actionButtons}
    `;
    
    card.classList.add('group');

    if (isAuthor) {
        card.querySelector('.edit-btn').addEventListener('click', () => handleEdit(id, text));
        card.querySelector('.delete-btn').addEventListener('click', () => handleDelete(id));
    }

    return card;
}

async function handleAddMessage(e) {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    if (messageText && userId) {
        try {
            const messagesCollection = collection(db, messagesCollectionPath);
            await addDoc(messagesCollection, {
                text: messageText,
                createdAt: serverTimestamp(),
                authorId: userId
            });
            messageInput.value = '';
        } catch (error) {
            console.error("Error adding message: ", error);
        }
    }
}
        
async function handleDelete(id) {
    if (!userId) return;
    if (confirm("Bạn có chắc chắn muốn xóa lời nhắn này?")) {
        try {
            const messageDoc = doc(db, messagesCollectionPath, id);
            await deleteDoc(messageDoc);
        } catch (error) {
            console.error("Error deleting message: ", error);
        }
    }
}

function handleEdit(id, currentText) {
    currentEditId = id;
    editMessageInput.value = currentText;
    editModal.classList.remove('hidden');
    editModal.classList.add('modal-enter-active');
}

function closeEditModal() {
    editModal.classList.remove('modal-enter-active');
    editModal.classList.add('modal-leave-active');
    setTimeout(() => {
         editModal.classList.add('hidden');
         editModal.classList.remove('modal-leave-active');
    }, 300);
}

async function saveEditedMessage() {
    const newText = editMessageInput.value.trim();
    if (newText && currentEditId && userId) {
        try {
            const messageDoc = doc(db, messagesCollectionPath, currentEditId);
            await updateDoc(messageDoc, { text: newText });
            closeEditModal();
        } catch (error) {
            console.error("Error updating message: ", error);
        }
    }
}

// --- EVENT LISTENERS ---
addMessageForm.addEventListener('submit', handleAddMessage);
saveEditBtn.addEventListener('click', saveEditedMessage);
cancelEditBtn.addEventListener('click', closeEditModal);

editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
});

// --- START THE APP ---
initializeFirebase();
