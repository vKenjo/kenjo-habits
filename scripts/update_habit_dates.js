// Script to update habit created_at dates
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mihhakhjhbsbqhmgfeoh.supabase.co';
const supabaseKey = 'sb_publishable_y79s6yOansdfJM8mCwcMYA_t_YvKTrj';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateHabitDates() {
    // Update the first 3 habits to have created_at of January 1, 2026
    const { data, error } = await supabase
        .from('habits')
        .update({ created_at: '2026-01-01T00:00:00+08:00' })
        .in('name', ['Read a book', 'Exercise', 'Journal'])
        .select();

    if (error) {
        console.error('Error updating first 3 habits:', error);
        return;
    }

    console.log('Updated first 3 habits:', data);

    // Update Talking habit to have created_at of January 2, 2026
    const { data: talkingData, error: talkingError } = await supabase
        .from('habits')
        .update({ created_at: '2026-01-02T00:00:00+08:00' })
        .eq('name', 'Talking')
        .select();

    if (talkingError) {
        console.error('Error updating Talking habit:', talkingError);
        return;
    }

    console.log('Updated Talking habit:', talkingData);

    // Also verify current habit data
    const { data: allHabits, error: fetchError } = await supabase
        .from('habits')
        .select('*')
        .order('sort_order');

    if (fetchError) {
        console.error('Error fetching habits:', fetchError);
        return;
    }

    console.log('\nAll habits after update:');
    allHabits.forEach(habit => {
        console.log(`- ${habit.name}: created_at = ${habit.created_at}`);
    });
}

updateHabitDates();
