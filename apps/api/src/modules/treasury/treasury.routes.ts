import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { loadUserWithPermissions } from '../auth/auth.service.js'
import { UnauthorizedError } from '../../utils/errors.js'
import { positiveId } from './treasury-posting.js'
import * as service from './treasury.service.js'
const router=Router()
router.use(authenticate)
router.use(async(req,res,next)=>{try {const u=await loadUserWithPermissions(req.user!.sub);if(!u.isActive)throw new UnauthorizedError();res.locals.actor={id:u.id,permissions:u.permissions};res.set('Cache-Control','no-store');next()}catch(e){next(e)}})
const route=(work:(req:any,actor:service.TreasuryActor)=>Promise<any>)=>async(req:any,res:any,next:any)=>{try{res.json(await work(req,res.locals.actor))}catch(e){next(e)}}
router.get('/config',route(()=>service.getConfig()))
router.get('/summary',route((req,a)=>service.handoverSummary(a)))
router.get('/me',route((req,a)=>service.getMine(a)))
router.get('/setup-options',route((req,a)=>service.setupOptions(a)))
router.get('/accounts',route((req,a)=>service.listAccounts(a)))
router.post('/accounts',route((req,a)=>service.createAccount(a,req.body)))
router.get('/accounts/:id/movements',route((req,a)=>service.movements(a,positiveId(req.params.id),req.query)))
router.post('/assignments',route((req,a)=>service.assignDrawer(a,req.body)))
router.post('/activate',route((req,a)=>service.activate(a,req.body)))
router.get('/funding',route((req,a)=>service.listFunding(a,req.query)))
router.post('/funding',route((req,a)=>service.authorizeFunding(a,req.body)))
router.post('/funding/:id/accept',route((req,a)=>service.acceptFunding(a,positiveId(req.params.id),req.body)))
router.post('/funding/:id/cancel',route((req,a)=>service.cancelFunding(a,positiveId(req.params.id),req.body)))
router.get('/handovers',route((req,a)=>service.listHandovers(a,req.query)))
router.get('/handovers/:id',route((req,a)=>service.handoverDetail(a,positiveId(req.params.id))))
router.post('/handovers/:id/confirm',route((req,a)=>service.confirmHandover(a,positiveId(req.params.id),req.body)))
router.post('/handovers/:id/reject',route((req,a)=>service.rejectHandover(a,positiveId(req.params.id),req.body)))
router.post('/handovers/:id/replace',route((req,a)=>service.replaceHandover(a,positiveId(req.params.id),req.body)))
export default router
