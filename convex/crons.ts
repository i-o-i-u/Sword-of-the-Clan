// المهامّ الدوريّة.
//
// كنسُ الصور اليتيمة مرّةً كلَّ يوم، في الثالثة فجرًا بتوقيت مكّة: ما استُبدل
// من الأغلفة والكعوب والشعارات وصور الهبوط يُحذف من التخزين (`images.sweep`).

import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.daily('sweep orphan images', { hourUTC: 0, minuteUTC: 0 }, internal.images.sweep, {})

export default crons
