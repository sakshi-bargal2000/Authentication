import express from 'express'
import { loginUser, logoutUser, myProfile, refershToken, registerUser, verifyOtp, verifyUser } from '../controllers/userController.js';
import { isAuth } from '../middleware/isAuth.js';

const router = express.Router();

router.post("/register",registerUser);
router.post("/verify/:token",verifyUser);
router.post("/login",loginUser);
router.post("/verify",verifyOtp);
router.get("/me",isAuth,myProfile);
router.post("/refersh",refershToken);
router.post("/logout",isAuth,logoutUser);


export default router;