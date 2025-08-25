import express from 'express';
import { create, deleteUser, getAllUsers, getUserById, updateUser } from '../controller/userController.js';

const router = express.Router();

router.post('/user', create);
router.get('/users', getAllUsers);
router.get('/user/:id', getUserById);
router.put('/user/:id', updateUser);
router.delete('/user/:id', deleteUser);

export default router;